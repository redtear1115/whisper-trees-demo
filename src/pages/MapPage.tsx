import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MAP_LOCALE, maplibregl, applyChineseLabels } from '../lib/maplibre'
import type { Map as MLMap, Marker, PointLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEMO, MAP_STYLE, NEAR } from '../config'
import { findTree, type Tree } from '../lib/trees'
import type { LngLat } from '../lib/geo'
import { clearActiveTour, demoHintSeen, dismissDemoHint, isDemoMode, setDemoPosition, totalWater, useActiveTour, useStore, useUserReady, useWishes, wishByPit } from '../store'
import type { ActiveTour } from '../store'
import type { Wish } from '../store/types'
import { WishCard } from '../features/wish/WishCard'
import { FeasibilityResult, WishForm, type PitInfo } from '../features/wish/WishForm'
import { Art } from '../components/ui'
import { IconHeading, IconLamp, IconLayers, IconNorth, IconTrash } from '../components/icons'
import { distanceMeters, walkTarget } from '../lib/geo'
import { STATUS_LABEL } from '../store/types'
import { assetUrl } from '../assets'
import { EventBar } from '../features/game/EventBar'
import { firstLightEarned, newcomerDone, showTasksChip, tasks } from '../features/game/onboarding'
import { TourSheet, useTourView } from '../features/onboarding/TourSheet'
import { useAnchor } from '../features/map/useAnchor'
import { circleRing } from '../lib/nearby'
import { angleDiff, requestHeadingPermission, watchHeading } from '../features/map/heading'
import { ringRadius, treesInRing } from '../features/map/ring'
import { hasFinePointer } from '../features/map/rotation'
import { RotationControl } from '../features/map/RotationControl'
import { BalanceChip } from '../features/nav/BalanceChip'
import { useAnimal } from '../features/avatar/useAnimal'
import { TreeRingLayer } from '../features/map/TreeRingLayer'
import { rangeInfo, TREE_FOCUS } from '../features/map/treeRings'
import { loadRoadGraph, prefixAtAsync, routeBetween, routeLabel, routeMidpoint, type Route } from '../lib/route'
import { treePrefix } from '../lib/treeId'
import { TourBar } from '../features/map/TourBar'
import { doneStopIds, EMPTY_LINE, movableBounds, TOUR_MIN_ZOOM, tourBounds, tourLine, unionBounds } from '../features/map/tour'

type Sheet =
  | { kind: 'pit'; pit: PitInfo; justWished?: boolean }
  | { kind: 'spot'; pit: PitInfo }
  | { kind: 'wish'; wishId: string; fresh?: boolean }
  | { kind: 'list' }
  | { kind: 'dlc'; which: 'trash' | 'light' }
  | null

type LayerKey = 'trees' | 'pits' | 'wishes' | 'parks'

/** 點樹後鏡頭飛進去前的視角，關掉行動圈時飛回來 */
interface View {
  center: LngLat
  zoom: number
  pitch: number
  bearing: number
}

/** 使用者設了「減少動態」就不要動畫 */
const motionMs = (ms: number) => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : ms)

// 市民端地圖只有「附近」：45° 俯視、街景、只能在目前位置半徑內移動（2026-10-19 決定，全市模式已移除）

export default function MapPage() {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    trees: true,
    pits: true,
    wishes: true,
    parks: true,
  })
  const [panel, setPanel] = useState(false)
  const [ready, setReady] = useState(false)
  const navState = useLocation().state as { focus?: LngLat; wishId?: string; routeTreeId?: string } | null
  const focus = navState?.focus
  const anchor = useAnchor(true)
  const [follow, setFollow] = useState(false)
  const [bearing, setBearing] = useState(0)
  const [headingMsg, setHeadingMsg] = useState<string | null>(null)
  // 桌機（沒有指南針）：「方向」按鈕改開旋轉控制
  const [finePointer] = useState(hasFinePointer)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [nearCount, setNearCount] = useState(0)
  // Demo 模式：人物可以拖曳；「可以拖曳牠移動位置」的提示每個 session 只出現一次
  const demo = isDemoMode()
  const [dragHint, setDragHint] = useState(() => demo && !demoHintSeen())
  // 點樹：鏡頭飛到樹旁，樹旁浮出行動圈。shown = 鏡頭到位了才顯示行動圈
  const [treeFocus, setTreeFocus] = useState<{ tree: Tree; shown: boolean } | null>(null)
  const focusRef = useRef(treeFocus)
  focusRef.current = treeFocus
  // 「怎麼走」：要畫路線的那棵樹的 id（只在那棵樹的行動圈開著時有效）、找到的路線（'none' = 找不到，null = 還沒找）
  const [routeFor, setRouteFor] = useState<string | null>(null)
  const [route, setRoute] = useState<Route | 'none' | null>(null)
  const routeFitted = useRef(false) // 這一次點「怎麼走」鏡頭是否已經拉過去（人走動重算路線時不再動鏡頭）
  const boundsLifted = useRef(false) // 為了看整條路線，暫時拿掉「只能在附近移動」的限制
  const prevView = useRef<View | null>(null)
  // 里路線（集章冊按「開始」）：畫在大地圖上，結束前一直都在
  const activeTour = useActiveTour()
  const tourRef = useRef(activeTour)
  tourRef.current = activeTour
  const tourFitted = useRef<number | null>(null) // 已經把鏡頭拉到整條路線的那一次（startedAt）
  const checkins = useStore((s) => s.checkins)
  const tourDone = useMemo(() => (activeTour ? doneStopIds(activeTour, checkins) : new Set<string>()), [activeTour, checkins])
  const navigate = useNavigate()
  const animal = useAnimal()
  const wishes = useWishes()
  const tour = useTourView()
  const userReady = useUserReady()
  const firstLight = useStore((s) => firstLightEarned(s))
  const tasksDone = useStore((s) => tasks(s).filter((t) => t.done).length) // 回數字才不會每次都是新值
  const allTasksDone = useStore((s) => newcomerDone(s))

  useEffect(() => {
    const base = new URL(import.meta.env.BASE_URL, location.origin).href
    const m = new maplibregl.Map({
      container: el.current!,
      style: MAP_STYLE,
      center: DEMO.center,
      zoom: NEAR.zoom,
      pitch: NEAR.pitch,
      bearing: NEAR.bearing,
      maxPitch: 60,
      attributionControl: false,
      locale: MAP_LOCALE,
    })
    map.current = m
    ;(window as unknown as { __map: MLMap }).__map = m // 給自動化測試用
    m.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '樹木與樹穴：臺北市政府開放資料｜公園範圍：© OpenStreetMap contributors',
      }),
    )
    // 指北針是右側工具列自己的按鈕（和圖層、跟著方向放在一起）
    m.on('rotate', () => setBearing(m.getBearing()))
    m.once('load', () => setBearing(m.getBearing()))
    // 手動轉動地圖就停止「跟著方向」
    m.on('rotatestart', (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) setFollow(false)
    })
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'bottom-right',
    )
    m.on('load', () => {
      // 小螢幕上署名預設展開會擋住按鈕，先收起來（點 i 可展開）
      el.current?.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')
      // 靜態圖磚：Cloudflare Pages 不支援 HTTP Range，不能用單一 PMTiles 檔
      m.addSource('trees', {
        type: 'vector',
        tiles: [`${base}data/tree-tiles/{z}/{x}/{y}.pbf`],
        minzoom: 10,
        maxzoom: 16,
        bounds: [121.4619, 24.9771, 121.6268, 25.1652],
      })
      m.addSource('pits', { type: 'geojson', data: `${base}data/pits-empty.geojson` })
      m.addSource('parks', { type: 'geojson', data: `${base}data/parks.geojson` })
      m.addLayer({
        id: 'parks',
        type: 'fill',
        source: 'parks',
        paint: { 'fill-color': '#bfdcb6', 'fill-opacity': 0.45, 'fill-outline-color': '#8fbf86' },
      })
      // 2.5D：底圖的建物拉高成立體方塊（附近模式才看得出來）
      m.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 15,
        paint: {
          // 淡、暖、矮一點：建物只是舞台，樹才是主角
          'fill-extrusion-color': '#f3ecdc',
          'fill-extrusion-height': ['*', 0.6, ['coalesce', ['get', 'render_height'], 8]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.5,
        },
      })
      // 附近模式的可探索範圍
      m.addSource('nearby', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'nearby-edge',
        type: 'line',
        source: 'nearby',
        paint: { 'line-color': '#3f7d4e', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
      })
      // 人物感應圈：半徑和打卡判斷共用（ringRadius → checkinRadius）。畫在樹的下面，圈內的樹另外畫一層亮的
      m.addSource('ring', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'ring-fill',
        type: 'fill',
        source: 'ring',
        paint: { 'fill-color': '#f6d98a', 'fill-opacity': 0.2 },
      })
      m.addLayer({
        id: 'ring-glow',
        type: 'line',
        source: 'ring',
        paint: { 'line-color': '#f2c14e', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.45 },
      })
      m.addLayer({
        id: 'ring-line',
        type: 'line',
        source: 'ring',
        paint: { 'line-color': '#d9a935', 'line-width': 1.5, 'line-opacity': 0.8 },
      })
      m.addLayer({
        id: 'trees',
        type: 'circle',
        source: 'trees',
        'source-layer': 'trees',
        paint: {
          'circle-color': ['match', ['get', 'k'], 'p', '#5f9e6e', '#3f7d4e'],
          // 放大時畫成樹冠大小，平貼在地面上
          'circle-radius': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.9, 14, 2.4, 16, 6, 18, 15, 20, 40],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 15, 0.82],
          'circle-stroke-color': '#d8ead5',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 15, 0, 17, 1.5],
          'circle-pitch-alignment': 'map',
        },
      })
      // 圈內的樹：用同一份圖磚，只畫落在感應圈裡的（filter 在 MapPage 的感應圈 effect 設定）
      m.addLayer({
        id: 'trees-near',
        type: 'circle',
        source: 'trees',
        'source-layer': 'trees',
        layout: { visibility: 'none' },
        paint: {
          'circle-color': '#7fc48c',
          'circle-radius': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.9, 14, 2.4, 16, 6, 18, 15, 20, 40],
          'circle-opacity': 0.95,
          'circle-stroke-color': '#f2c14e',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 17, 2.5],
          'circle-pitch-alignment': 'map',
        },
      })
      m.addLayer({
        id: 'pits',
        type: 'circle',
        source: 'pits',
        minzoom: 12,
        paint: {
          'circle-color': 'rgba(255,255,255,0.6)',
          'circle-stroke-color': '#b36b2c',
          // 拉遠時淡一點、小一點：不要讓城市看起來全是坑
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 15, 1.2, 17, 2],
          'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.35, 15, 0.9],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, 1],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 3.5, 17, 6, 19, 10],
        },
      })
      // 里路線（集章冊「開始」）：白色描邊加深綠色線，畫在樹的上面、「怎麼走」的路線下面
      m.addSource('tour', { type: 'geojson', data: EMPTY_LINE })
      m.addLayer({
        id: 'tour-casing',
        type: 'line',
        source: 'tour',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 7, 18, 11, 20, 15] },
      })
      m.addLayer({
        id: 'tour-line',
        type: 'line',
        source: 'tour',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2b5e38', 'line-opacity': 0.95, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 4, 18, 6, 20, 9] },
      })
      // 「怎麼走」的步行路線：白色描邊加一條平靜的深綠色線，畫在樹的上面
      m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer(
        {
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 8, 18, 12, 20, 16] },
        },
      )
      m.addLayer(
        {
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2f7d6d', 'line-opacity': 0.95, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 5, 18, 7, 20, 10] },
        },
      )
      // 選到的樹或樹穴：一圈光暈
      m.addSource('selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer(
        {
          id: 'selected',
          type: 'circle',
          source: 'selected',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 17, 18, 19, 30, 21, 64],
            'circle-color': 'rgba(242, 193, 78, 0.35)',
            'circle-stroke-color': '#c98a00',
            'circle-stroke-width': 2.5,
            'circle-pitch-alignment': 'map',
          },
        },
        'trees',
      )
      applyChineseLabels(m)
      setReady(true)
    })
    m.on('click', (e) => {
      setPanel(false)
      const pad = 10
      const box: [PointLike, PointLike] = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad],
      ]
      const layersNow = ['pits', 'trees'].filter((l) => m.getLayer(l) && m.getLayoutProperty(l, 'visibility') !== 'none')
      const hit = m.queryRenderedFeatures(box, { layers: layersNow })[0]
      const focused = focusRef.current
      if (hit?.layer.id === 'trees') {
        // 點樹：鏡頭飛進去，樹旁浮出行動圈（不開抽屜）。已在看的那棵再點一次不動作；點別棵就換過去
        const id = hit.properties.id as string
        if (focused?.tree.id === id) return
        setSheet(null)
        findTree(id).then((tree) => tree && focusTree.current(tree))
        return
      }
      // 點別處：收起行動圈、鏡頭飛回原來的街景
      if (focused) return unfocusTree.current()
      if (!hit) return setSheet(null)
      select(m, (hit.geometry as unknown as { coordinates: LngLat }).coordinates)
      {
        const p = hit.properties
        const coords = (hit.geometry as unknown as { coordinates: LngLat }).coordinates
        const existing = wishByPit(p.pit_id as string)
        if (existing) return setSheet({ kind: 'wish', wishId: existing.id })
        setSheet({
          kind: 'pit',
          pit: { pitId: p.pit_id as string, lngLat: coords, road: (p.road as string) ?? '', district: p.district as string },
        })
      }
    })
    // 長按（或右鍵）任意位置許願：不是樹穴，初步判斷為「需會勘」
    const wishAt = (point: maplibregl.Point, lngLat: maplibregl.LngLat) => {
      if (focusRef.current) return // 行動圈開著時不開許願
      select(m, [lngLat.lng, lngLat.lat])
      const near = m
        .queryRenderedFeatures(
          [
            [point.x - 80, point.y - 80],
            [point.x + 80, point.y + 80],
          ],
          { layers: m.getLayer('pits') ? ['pits'] : [] },
        )
        .map((f) => f.properties)[0]
      setSheet({
        kind: 'spot',
        pit: {
          pitId: null,
          lngLat: [lngLat.lng, lngLat.lat],
          road: (near?.road as string) || '',
          district: (near?.district as string) || '',
        },
      })
    }
    // 拖曳人物（Demo）不是許願：手指或滑鼠落在人物上時不開許願
    const onAvatar = (e: { originalEvent?: Event }) => !!(e.originalEvent?.target as Element | null)?.closest?.('.me-avatar')
    m.on('contextmenu', (e) => !onAvatar(e) && wishAt(e.point, e.lngLat))
    let press: ReturnType<typeof setTimeout> | undefined
    m.on('touchstart', (e) => {
      if (e.points.length !== 1 || onAvatar(e)) return
      press = setTimeout(() => wishAt(e.point, e.lngLat), 650)
    })
    for (const ev of ['touchend', 'touchmove', 'touchcancel', 'movestart'] as const) m.on(ev, () => clearTimeout(press))
    for (const l of ['trees', 'pits']) {
      m.on('mouseenter', l, () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', l, () => (m.getCanvas().style.cursor = ''))
    }
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // 從「樹洞」的我的許願點「在地圖上看」：飛到那個許願（只有附近模式，許願在可移動範圍之外時鏡頭停在範圍邊緣，抽屜照開）
  useEffect(() => {
    if (!focus || !ready || !map.current) return
    const m = map.current
    const t = setTimeout(() => {
      m.flyTo({ center: focus, zoom: 17.5, duration: 1200, offset: [0, -window.innerHeight * 0.2] })
      select(m, focus, false)
      if (navState?.wishId) setSheet({ kind: 'wish', wishId: navState.wishId })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ready])

  // 從「樹洞」附近的樹按「怎麼走」：飛到那棵樹、浮出行動圈，並直接畫出步行路線
  const routeTreeId = navState?.routeTreeId
  useEffect(() => {
    if (!routeTreeId || !ready || !map.current) return
    let alive = true
    findTree(routeTreeId).then((tree) => {
      if (!alive || !tree) return
      focusTree.current(tree)
      routeFitted.current = false
      setRouteFor(tree.id)
    })
    return () => {
      alive = false
    }
  }, [routeTreeId, ready])

  // 圖層面板：Esc 關閉
  useEffect(() => {
    if (!panel) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  // 開抽屜時收起圖層面板；關抽屜時清掉選取光暈
  useEffect(() => {
    if (sheet) setPanel(false)
    else (map.current?.getSource('selected') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: [],
    })
  }, [sheet])

  // 附近模式：鏡頭角度與可移動範圍
  const centeredOn = useRef<string | null>(null)
  const anchorRef = useRef(anchor)
  anchorRef.current = anchor
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const nearby = m.getSource('nearby') as maplibregl.GeoJSONSource | undefined
    const key = `${anchor.source}:${anchor.lngLat.join()}`
    nearby?.setData({ type: 'Polygon', coordinates: [circleRing(anchor.lngLat, NEAR.radiusMeters)] })
    m.setMaxBounds(null)
    if (!boundsLifted.current) m.setMinZoom(nearMinZoom())
    if (focusRef.current) {
      // 正在看一棵樹：不把鏡頭拉回人身上，只更新可移動範圍（正在看整條路線時先不限制）
      if (!boundsLifted.current) m.setMaxBounds(nearBounds())
    } else if (centeredOn.current === null && tourRef.current) {
      // 帶著里路線進地圖：鏡頭由下面的路線 effect 拉到整條路線，不先飛去人身上
      centeredOn.current = key
      m.setMaxBounds(nearBounds())
    } else if (centeredOn.current !== key) {
      // 進附近模式、或人移動了：鏡頭移到新的中心。進附近模式用預設街景縮放；人走動時保留使用者目前的縮放（至少 minZoom）。
      // 上一段動畫可能被打斷，所以角度用「至少」而不是沿用目前值
      const entering = centeredOn.current === null
      centeredOn.current = key
      m.easeTo({
        center: anchor.lngLat,
        zoom: entering ? NEAR.zoom : Math.max(m.getZoom(), NEAR.minZoom),
        pitch: m.getPitch() < 30 ? NEAR.pitch : m.getPitch(),
        bearing: m.getPitch() < 30 ? NEAR.bearing : m.getBearing(),
        duration: 700,
      })
      // 動畫結束才鎖範圍，並用最新的中心（避免被打斷的動畫拿到舊位置）
      m.once('moveend', () => {
        m.setMaxBounds(nearBounds())
      })
    } else {
      m.setMaxBounds(nearBounds())
    }
  }, [anchor, ready])

  // 鏡頭可以移動的範圍：人所在處半徑 300 m；有里路線時再把整條路線（外擴 300 m）併進來
  function nearBounds() {
    return movableBounds(anchorRef.current.lngLat, NEAR.radiusMeters, tourRef.current)
  }
  function nearMinZoom() {
    return tourRef.current ? TOUR_MIN_ZOOM : NEAR.minZoom
  }

  // 人物：使用者選的動物站在目前位置（Demo 示範位置或 GPS）。HTML 標記，永遠面向畫面。附近模式才顯示
  // Demo：可以拖曳（滑鼠與觸控都行，拖曳人物不會平移地圖），放開時模擬位置移到那裡，感應圈、範圍、提示都跟著重算
  const draggable = demo && anchor.source === 'demo'
  const showDragHint = draggable && dragHint && !sheet && !tour.open && !treeFocus
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const node = document.createElement('div')
    node.className = 'me-avatar'
    node.dataset.testid = 'avatar-marker'
    node.dataset.animal = animal.id
    node.dataset.source = anchor.source
    node.setAttribute('role', 'img')
    node.setAttribute('aria-label', `你在這裡：${animal.name}`)
    const img = document.createElement('img')
    img.src = assetUrl(animal.art)
    img.alt = ''
    img.draggable = false
    node.append(img)
    if (anchor.source !== 'gps') {
      // Demo／沒有定位：小字標示這是示範位置
      const tag = document.createElement('span')
      tag.className = 'me-avatar-tag'
      tag.textContent = '示範位置'
      node.append(tag)
    }
    if (draggable) {
      node.classList.add('draggable')
      node.dataset.draggable = 'true'
      node.addEventListener('click', (e) => e.stopPropagation()) // 拖曳放開後的 click 不要當成點地圖
    }
    if (showDragHint) {
      const hint = document.createElement('div')
      hint.className = 'me-avatar-hint'
      hint.dataset.testid = 'drag-hint'
      hint.setAttribute('role', 'status')
      const text = document.createElement('span')
      text.textContent = 'Demo：可以拖曳牠移動位置'
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'me-avatar-hint-close'
      close.dataset.testid = 'drag-hint-close'
      close.setAttribute('aria-label', '知道了，收起提示')
      close.textContent = '×'
      close.addEventListener('click', (e) => {
        e.stopPropagation()
        dismissDemoHint()
        setDragHint(false)
      })
      hint.append(text, close)
      node.append(hint)
    }
    const marker = new maplibregl.Marker({ element: node, anchor: 'bottom', draggable }).setLngLat(anchor.lngLat).addTo(m)
    if (draggable) {
      marker.on('dragend', () => {
        const at = marker.getLngLat()
        dismissDemoHint()
        setDragHint(false)
        setDemoPosition([at.lng, at.lat])
      })
    }
    return () => {
      marker.remove()
    }
  }, [ready, anchor.lngLat, anchor.source, animal, draggable, showDragHint])

  // 點樹：鏡頭飛到樹旁（約 20.5 級、60° 俯角、樹在畫面中心偏上），到位後浮出行動圈
  const focusTree = useRef<(tree: Tree) => void>(() => {})
  focusTree.current = (tree) => {
    const m = map.current
    if (!m) return
    if (!prevView.current) {
      const c = m.getCenter()
      prevView.current = { center: [c.lng, c.lat], zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() }
    }
    select(m, tree.lngLat, false)
    setPanel(false)
    setTreeFocus({ tree, shown: false })
    const duration = motionMs(TREE_FOCUS.durationMs)
    m.easeTo({
      center: tree.lngLat,
      zoom: TREE_FOCUS.zoom,
      pitch: TREE_FOCUS.pitch,
      offset: [0, -m.getCanvas().clientHeight * TREE_FOCUS.offsetY],
      duration,
    })
    const show = () => setTreeFocus((f) => (f && f.tree.id === tree.id ? { ...f, shown: true } : f))
    // 減少動態：鏡頭直接到位，沒有 moveend 可等
    if (duration === 0) show()
    else m.once('moveend', show)
  }
  function restoreBounds() {
    if (!boundsLifted.current) return
    boundsLifted.current = false
    map.current?.setMinZoom(nearMinZoom())
    map.current?.setMaxBounds(nearBounds())
  }
  // 收起行動圈並飛回原來的街景
  const unfocusTree = useRef<() => void>(() => {})
  unfocusTree.current = () => {
    const m = map.current
    const prev = prevView.current
    leaveFocus(!prev)
    if (m && prev) {
      m.easeTo({ ...prev, duration: motionMs(TREE_FOCUS.durationMs) })
      m.once('moveend', restoreBounds) // 飛回街景之後才把「只能在附近移動」的限制裝回去
    }
  }
  // 不飛回去，只是離開（要開別的抽屜時）。restore = false：呼叫的人自己等鏡頭到位再裝回移動限制
  function leaveFocus(restore = true) {
    prevView.current = null
    setTreeFocus(null)
    setRouteFor(null)
    if (restore) restoreBounds()
    ;(map.current?.getSource('selected') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] })
  }

  // 「怎麼走」：找路網、算路線（人移動了就重算，鏡頭只在第一次拉）
  const focusTreeId = treeFocus?.tree.id ?? null
  const anchorKey = anchor.lngLat.join()
  useEffect(() => {
    const tree = focusRef.current?.tree
    if (!ready || !tree || routeFor !== tree.id) return setRoute(null)
    let alive = true
    ;(async () => {
      const from = anchorRef.current.lngLat
      const prefixes = [treePrefix(tree.id), await prefixAtAsync(from)]
      let found: Route | null = null
      for (const prefix of new Set(prefixes)) {
        const graph = prefix ? await loadRoadGraph(prefix) : null
        found = graph && routeBetween(graph, from, tree.lngLat)
        if (found) break
      }
      if (alive) setRoute(found ?? 'none')
    })()
    return () => {
      alive = false
    }
  }, [routeFor, focusTreeId, anchorKey, ready])

  // 畫路線與路線上的標籤；第一次出現時鏡頭拉到看得到整條路線
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const source = m.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (!route || route === 'none') {
      source?.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coords } })
    const label = document.createElement('div')
    label.className = 'route-label'
    label.dataset.testid = 'route-label'
    label.setAttribute('role', 'status')
    label.textContent = routeLabel(route)
    const marker = new maplibregl.Marker({ element: label, anchor: 'bottom', offset: [0, -16] }).setLngLat(routeMidpoint(route.coords)).addTo(m)
    if (!routeFitted.current) {
      routeFitted.current = true
      // 把路線連同它對著樹的鏡像一起框進畫面：樹留在畫面中間，行動圈（左右各約 150 px）才不會被切到
      const tree = route.coords[route.coords.length - 1]
      const bounds = new maplibregl.LngLatBounds(tree, tree)
      for (const c of route.coords) bounds.extend(c).extend([2 * tree[0] - c[0], 2 * tree[1] - c[1]])
      boundsLifted.current = true
      m.setMaxBounds(null)
      m.setMinZoom(13) // 路線長時要拉得比街景遠才框得下
      m.fitBounds(bounds, {
        padding: { top: 130, bottom: 240, left: 24, right: 24 },
        maxZoom: 19.5,
        pitch: 0,
        duration: motionMs(TREE_FOCUS.durationMs),
      })
    }
    return () => {
      marker.remove()
    }
  }, [route, ready])

  // 里路線：畫線、放寬可移動範圍；第一次出現（按「開始」進來）時鏡頭拉到整條路線；結束後飛回人身上、裝回範圍
  const hadTour = useRef(false)
  function fitTour(t: ActiveTour) {
    const m = map.current
    if (!m) return
    const b = unionBounds(tourBounds(t), [anchorRef.current.lngLat, anchorRef.current.lngLat])
    // 上面有光點餘額與頂端列，下面有掃樹牌按鈕與導覽，右邊有地圖工具
    m.fitBounds(b, { padding: { top: 150, bottom: 200, left: 36, right: 84 }, maxZoom: 18.5, pitch: 0, duration: motionMs(900) })
  }
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const source = m.getSource('tour') as maplibregl.GeoJSONSource | undefined
    if (!activeTour) {
      source?.setData(EMPTY_LINE)
      tourFitted.current = null
      if (!hadTour.current) return
      hadTour.current = false
      if (boundsLifted.current || focusRef.current) return // 看「怎麼走」整條路線或正在看樹：範圍等他們收起時再裝回
      m.easeTo({ center: anchorRef.current.lngLat, zoom: NEAR.zoom, pitch: NEAR.pitch, bearing: NEAR.bearing, duration: motionMs(700) })
      m.once('moveend', () => {
        // 動畫結束才把範圍縮回人身上（先縮的話鏡頭會被硬拉回來）
        if (boundsLifted.current || focusRef.current) return
        m.setMinZoom(nearMinZoom())
        m.setMaxBounds(nearBounds())
      })
      return
    }
    hadTour.current = true
    source?.setData(tourLine(activeTour))
    if (!boundsLifted.current) {
      m.setMinZoom(nearMinZoom())
      m.setMaxBounds(nearBounds())
    }
    if (tourFitted.current !== activeTour.startedAt && !focusRef.current) {
      tourFitted.current = activeTour.startedAt
      fitTour(activeTour)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTour, ready])

  // 里路線的標記：起點、依序編號的停靠樹（走過的打 ✓、變淡）、終點。停靠樹可以點：鏡頭飛到那棵樹，浮出行動圈
  useEffect(() => {
    const m = map.current
    if (!m || !ready || !activeTour) return
    const markers: Marker[] = []
    const pin = <K extends 'div' | 'button'>(el: K, cls: string, text: string, tag?: string) => {
      const node = document.createElement(el)
      node.className = `route-pin ${cls}`
      node.textContent = text
      if (tag) {
        const t = document.createElement('span')
        t.className = 'route-pin-tag'
        t.textContent = tag
        node.append(t)
      }
      return node
    }
    const start = pin('div', 'start', '起', '起點')
    start.dataset.testid = 'tour-start'
    markers.push(new maplibregl.Marker({ element: start }).setLngLat(activeTour.start).addTo(m))
    const next = activeTour.stops.findIndex((s) => !tourDone.has(s.id)) // 下一站：疊在別的圈上面、加一圈金色
    activeTour.stops.forEach((s, i) => {
      const last = i === activeTour.stops.length - 1
      const done = tourDone.has(s.id)
      const btn = pin('button', `stop tour-pin${last ? ' finish' : ''}${done ? ' done' : ''}${i === next ? ' next' : ''}`, done ? '✓' : String(i + 1), last ? '終點' : undefined)
      btn.type = 'button'
      btn.style.zIndex = i === next ? '3' : done ? '1' : '2'
      btn.dataset.testid = 'tour-stop'
      btn.dataset.index = String(i + 1)
      btn.dataset.treeId = s.id
      btn.dataset.done = String(done)
      btn.setAttribute('aria-label', `第 ${i + 1} 站${last ? '（終點）' : ''}：${s.id}${done ? '，已點亮' : ''}`)
      btn.onclick = (ev) => {
        ev.stopPropagation()
        if (focusRef.current?.tree.id === s.id) return
        setSheet(null)
        findTree(s.id).then((tree) => tree && focusTree.current(tree))
      }
      markers.push(new maplibregl.Marker({ element: btn }).setLngLat(s.lngLat).addTo(m))
    })
    return () => markers.forEach((k) => k.remove())
  }, [activeTour, tourDone, ready])

  // 人物感應圈與圈內的樹（只在附近模式、有定位或 Demo 時）
  const radius = ringRadius(anchor)
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const ring = m.getSource('ring') as maplibregl.GeoJSONSource | undefined
    if (radius === null) {
      ring?.setData({ type: 'FeatureCollection', features: [] })
      m.setLayoutProperty('trees-near', 'visibility', 'none')
      setNearCount(0)
      return
    }
    const polygon = { type: 'Polygon' as const, coordinates: [circleRing(anchor.lngLat, radius)] }
    ring?.setData(polygon)
    m.setFilter('trees-near', ['within', polygon])
    m.setLayoutProperty('trees-near', 'visibility', layers.trees ? 'visible' : 'none')
    // 數圈內的樹：用已載入的圖磚算距離（和打卡同一個半徑）。人拖開、圖磚還沒載入時保留上一次的數字
    const count = () => {
      if (!layers.trees) return setNearCount(0)
      const p = m.project(anchor.lngLat)
      const { clientWidth: w, clientHeight: h } = m.getCanvas()
      if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return
      const found = m.querySourceFeatures('trees', { sourceLayer: 'trees' }).map((f) => ({
        id: String(f.properties.id),
        lngLat: (f.geometry as unknown as { coordinates: LngLat }).coordinates,
      }))
      setNearCount(treesInRing(found, anchor.lngLat, radius).length)
    }
    count()
    m.on('idle', count)
    return () => {
      m.off('idle', count)
    }
  }, [radius, anchor.lngLat, ready, layers.trees])

  // 跟著方向：地圖隨手機指南針轉動，讓畫面的上方就是你面向的方向
  useEffect(() => {
    const m = map.current
    if (!follow || !m) return
    let got = false
    const noSensor = setTimeout(() => {
      if (got) return
      setFollow(false)
      setRotateOpen(true) // 沒有指南針：改開旋轉控制
    }, 2500)
    const stop = watchHeading((deg) => {
      got = true
      if (angleDiff(deg, m.getBearing() < 0 ? m.getBearing() + 360 : m.getBearing()) > 3) {
        m.rotateTo(deg, { duration: 200 })
      }
    })
    return () => {
      clearTimeout(noSensor)
      stop()
    }
  }, [follow])

  // 許願圖層：小樹苗，大小對應澆水數
  useEffect(() => {
    const m = map.current
    if (!m || !layers.wishes) return
    const markers: Marker[] = wishes.map((w) => {
      const size = Math.min(44, 22 + Math.sqrt(totalWater(w)) * 2.5)
      const node = document.createElement('button')
      node.className = 'wish-marker'
      node.style.width = node.style.height = `${size}px`
      node.style.backgroundImage = `url(${assetUrl('sapling')})`
      node.setAttribute('aria-label', `${w.road} 的許願`)
      // 地圖外的標記不進 Tab 順序；鍵盤使用者從「樹洞」的我的許願進入
      node.tabIndex = -1
      node.onclick = (ev) => {
        ev.stopPropagation()
        leaveFocus()
        select(m, w.lngLat)
        setSheet({ kind: 'wish', wishId: w.id })
      }
      return new maplibregl.Marker({ element: node }).setLngLat(w.lngLat).addTo(m)
    })
    return () => markers.forEach((mk) => mk.remove())
  }, [wishes, layers.wishes])

  useEffect(() => {
    const m = map.current
    if (!m) return
    const apply = () => {
      for (const l of ['trees', 'pits', 'parks'] as const) {
        if (m.getLayer(l)) m.setLayoutProperty(l, 'visibility', layers[l] ? 'visible' : 'none')
      }
    }
    if (m.isStyleLoaded()) apply()
    else m.once('idle', apply)
  }, [layers])

  // 點樹看行動圈時，其他浮動元件先收起，畫面只留地圖與行動圈
  const idle = !sheet && !tour.open && !treeFocus
  const focusRange = treeFocus ? rangeInfo(anchor, treeFocus.tree.lngLat) : null

  const sheetWish: Wish | undefined = sheet?.kind === 'wish' ? wishes.find((w) => w.id === sheet.wishId) : undefined

  return (
    <div className="map-page near">
      {/* 頁首放在地圖前面：鍵盤 Tab 先到導覽，再到地圖 */}
      <header className={`map-top${activeTour && !treeFocus ? ' has-tour' : ''}`}>
        <h1 className="sr-only">曦語地圖</h1>
        <BalanceChip />
        {activeTour && !treeFocus && (
          <TourBar tour={activeTour} done={tourDone.size} onFit={() => fitTour(activeTour)} onEnd={clearActiveTour} />
        )}
      </header>
      <div ref={el} className="map" aria-label="樹木地圖" role="region" />

      <div className="map-event">
        <EventBar />
      </div>

      {panel && (
        <div className="layer-panel" id="layer-panel">
          <button className="btn small block-left" onClick={() => setSheet({ kind: 'list' })}>
            列出附近的許願
          </button>
          {(
            [
              ['trees', '樹木', 'legend-tree'],
              ['pits', '空樹穴（可以許願）', 'legend-pit'],
              ['wishes', '許願', 'legend-wish'],
              ['parks', '公園範圍（OSM）', 'legend-park'],
            ] as const
          ).map(([k, label, cls]) => (
            <label key={k} className="row gap center-v">
              <input
                type="checkbox"
                checked={layers[k]}
                onChange={(e) => setLayers((s) => ({ ...s, [k]: e.target.checked }))}
              />
              <span className={`legend ${cls}`} aria-hidden />
              {label}
            </label>
          ))}
          <hr />
          <button className="dlc-option" onClick={() => setSheet({ kind: 'dlc', which: 'trash' })}>
            <IconTrash /> 垃圾桶 <span className="dlc-tag">即將推出</span>
          </button>
          <button className="dlc-option" onClick={() => setSheet({ kind: 'dlc', which: 'light' })}>
            <IconLamp /> 路燈 <span className="dlc-tag">即將推出</span>
          </button>
        </div>
      )}

      {sheet && (
        <Sheet onClose={() => setSheet(null)} label={sheetLabel(sheet, sheetWish)}>
          {sheet.kind === 'pit' && (
            <div>
              <div className="row gap center-v">
                <Art id="empty-pit" alt="" className="icon" />
                <div>
                  <h2>這裡可以種一棵樹</h2>
                  <p className="muted small">
                    {sheet.pit.district} {sheet.pit.road}
                  </p>
                </div>
              </div>
              <p className="small">這是一個空的樹穴：資料顯示這裡沒有登錄的樹。在這裡許願，之後你和路過的人都可以幫它澆水。</p>
              <p className="muted small">其他位置想要一棵樹？在地圖上長按就能許願。</p>
              <WishForm pit={sheet.pit} onDone={(w) => setSheet({ kind: 'wish', wishId: w.id, fresh: true })} />
            </div>
          )}
          {sheet.kind === 'spot' && (
            <div>
              <h2>在這裡許願種樹</h2>
              <p className="muted small">
                {sheet.pit.district || '這個位置'} {sheet.pit.road}・不是既有樹穴，市府要先會勘
              </p>
              <WishForm pit={sheet.pit} onDone={(w) => setSheet({ kind: 'wish', wishId: w.id, fresh: true })} />
            </div>
          )}
          {sheet.kind === 'wish' && sheetWish && (
            <div>
              {sheet.fresh && <FeasibilityResult wish={sheetWish} />}
              <WishCard wish={sheetWish} />
            </div>
          )}
          {sheet.kind === 'dlc' && <DlcCard which={sheet.which} />}
          {sheet.kind === 'list' && (
            <NearbyWishes
              wishes={wishes}
              center={map.current ? [map.current.getCenter().lng, map.current.getCenter().lat] : DEMO.center}
              onPick={(w) => {
                if (map.current) select(map.current, w.lngLat)
                setSheet({ kind: 'wish', wishId: w.id })
              }}
            />
          )}
        </Sheet>
      )}

      {treeFocus && focusRange && (
        <TreeRingLayer
          map={map.current}
          tree={treeFocus.tree}
          shown={treeFocus.shown}
          range={focusRange}
          onClose={() => unfocusTree.current()}
          demo={demo}
          extraNote={route === 'none' ? '找不到路線，這裡的小路可能沒有收錄' : routeFor === treeFocus.tree.id && !route ? '正在找路線…' : ''}
          onGo={(a) => {
            // 怎麼走：畫出（再點一次收起）從人物到這棵樹的步行路線，不換頁
            if (a.id === 'route') {
              routeFitted.current = false
              return setRouteFor((id) => (id === treeFocus.tree.id ? null : treeFocus.tree.id))
            }
            // Demo 的「走過去」：模擬位置移到樹旁，圈就跟著亮了（不換頁）；路線跟著收起
            if (a.id === 'walk') {
              setRouteFor(null)
              return setDemoPosition(walkTarget(anchor.lngLat, treeFocus.tree.lngLat))
            }
            // nearTree：從行動圈來而且在感應圈內，樹的頁面可以說「你已經在樹旁邊了」；打卡仍然要掃樹牌
            const state = { ...(a.hintTreeId && { hintTreeId: a.hintTreeId }), nearTree: focusRange.inRange }
            navigate({ pathname: a.to, hash: a.hash ? `#${a.hash}` : undefined }, { state })
          }}
        />
      )}

      {tour.open && !sheet && !treeFocus && <TourSheet step={tour.step} />}

      {!sheet && !treeFocus && showTasksChip({ ready: userReady, firstLight, tourOpen: tour.open, allDone: allTasksDone }) && (
        <Link className="tasks-chip" to="/explore" data-testid="tasks-chip">
          新手任務 {tasksDone}/4
        </Link>
      )}

      {idle && (
        <div className="map-tools" role="group" aria-label="地圖工具">
          <button
            className="tool"
            onClick={() => setPanel((p) => !p)}
            aria-expanded={panel}
            aria-controls="layer-panel"
            aria-label="圖層"
          >
            <IconLayers />
            <span>圖層</span>
          </button>
          <button
            className="tool"
            aria-label={`指北針：目前朝向 ${Math.round((bearing + 360) % 360)} 度，點一下轉回北方`}
            onClick={() => {
              setFollow(false)
              map.current?.easeTo({ bearing: 0, duration: 500 })
            }}
          >
            <span className="needle" style={{ transform: `rotate(${-bearing}deg)` }} aria-hidden>
              <IconNorth />
            </span>
            <span>北</span>
          </button>
          <button
            className={`tool ${follow || rotateOpen ? 'on' : ''}`}
            data-testid="heading-button"
            aria-pressed={finePointer ? undefined : follow}
            aria-expanded={finePointer ? rotateOpen : undefined}
            aria-label={finePointer ? '旋轉地圖' : '跟著手機方向轉動地圖'}
            onClick={async () => {
              setHeadingMsg(null)
              if (rotateOpen) return setRotateOpen(false)
              if (follow) return setFollow(false)
              // 桌機沒有指南針：直接開旋轉控制
              if (finePointer) {
                setPanel(false)
                return setRotateOpen(true)
              }
              if (!(await requestHeadingPermission())) {
                return setHeadingMsg('沒有方向權限。可以在瀏覽器設定開啟，或用兩指旋轉地圖。')
              }
              setFollow(true)
            }}
          >
            <IconHeading />
            <span>方向</span>
          </button>
        </div>
      )}

      {idle && rotateOpen && (
        <RotationControl map={map.current} bearing={bearing} onClose={() => setRotateOpen(false)} />
      )}

      {idle && (headingMsg || follow || anchor.source === 'fallback') && (
        <div className="mode-toggle">
          {headingMsg && <span className="mode-note">{headingMsg}</span>}
          {follow && <span className="mode-note">畫面上方就是你面向的方向</span>}
          {anchor.source === 'fallback' && !follow && !headingMsg && <span className="mode-note">沒有定位：先看示範樹周圍</span>}
        </div>
      )}

      {idle && (
        <p className="scan-hint" data-testid={nearCount > 0 ? 'near-hint' : undefined} data-count={nearCount || undefined}>
          {nearCount > 0 ? `附近有 ${nearCount} 棵樹可以掃` : '找一棵樹，掃它樹幹上的樹牌'}
        </p>
      )}
      {(idle || treeFocus) && (
        <Link className="scan-fab" to="/scan" state={treeFocus ? { hintTreeId: treeFocus.tree.id } : undefined}>
          掃樹牌
        </Link>
      )}
    </div>
  )
}

function DlcCard({ which }: { which: 'trash' | 'light' }) {
  return which === 'trash' ? (
    <div>
      <h2>
        <IconTrash /> 垃圾桶 <span className="dlc-tag">即將推出</span>
      </h2>
      <p>回報滿溢，依行人流量與大家的回報，建議哪裡該多放一個。</p>
      <p className="muted small">沿用同一套「市民回報 × 後台營運 × 政府資料」。目前只是預告，還沒有圖層。</p>
    </div>
  ) : (
    <div>
      <h2>
        <IconLamp /> 路燈 <span className="dlc-tag">即將推出</span>
      </h2>
      <p>回報路燈故障。公園處的「行道樹路燈資訊網」本來就把行道樹和路燈放在同一個系統。</p>
      <p className="muted small">目前只是預告，還沒有圖層。</p>
    </div>
  )
}


/** 底部抽屜：開啟時焦點移進來，Esc 或「關閉」收起，關閉後焦點回到原處 */
/** 標出選到的點，並把它移到抽屜上方看得到的地方 */
function select(m: MLMap, at: LngLat, pan = true) {
  ;(m.getSource('selected') as maplibregl.GeoJSONSource | undefined)?.setData({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: at },
    properties: {},
  })
  if (pan) m.easeTo({ center: at, offset: [0, -window.innerHeight * 0.22], duration: 500 })
}

function sheetLabel(sheet: NonNullable<Sheet>, wish?: Wish): string {
  switch (sheet.kind) {
    case 'pit':
      return `空樹穴・${sheet.pit.road || sheet.pit.district}`
    case 'spot':
      return '在這裡許願種樹'
    case 'wish':
      return wish ? `許願・${wish.district} ${wish.road}` : '許願'
    case 'dlc':
      return sheet.which === 'trash' ? '垃圾桶（即將推出）' : '路燈（即將推出）'
    case 'list':
      return '附近的許願'
  }
}

function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current()
      // Tab 只在抽屜裡循環
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]')]
        .filter((el) => !el.hasAttribute('disabled'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.()
    }
  }, [])
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
      <div className="sheet-grip" aria-hidden />
      <button className="sheet-close" onClick={onClose}>
        關閉
      </button>
      {children}
    </div>
  )
}

/** 附近的許願清單：給鍵盤與螢幕閱讀器使用者，也方便找鄰居的願望澆水 */
function NearbyWishes({ wishes, center, onPick }: { wishes: Wish[]; center: LngLat; onPick: (w: Wish) => void }) {
  const near = wishes
    .map((w) => ({ w, d: distanceMeters(center, w.lngLat) }))
    .filter((x) => x.d <= 1500)
    .sort((a, b) => a.d - b.d)
  return (
    <div>
      <h2>附近的許願</h2>
      {near.length === 0 && <p className="muted">1.5 公里內還沒有人許願。點空樹穴就能許第一個願。</p>}
      <ul className="nearby-list">
        {near.map(({ w, d }) => (
          <li key={w.id}>
            <button className="nearby-item" onClick={() => onPick(w)}>
              <span>
                <strong>{w.road || w.district}</strong>
                <span className="muted small">
                  {' '}
                  {Math.round(d)} 公尺・{STATUS_LABEL[w.history[w.history.length - 1].status]}
                </span>
              </span>
              <span className="muted small">{w.reasons.join('、')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
