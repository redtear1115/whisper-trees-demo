import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { maplibregl } from '../lib/maplibre'
import type { Map as MLMap, Marker, PointLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEMO, MAP_STYLE, NEAR } from '../config'
import { findTree, loadDistricts, type District, type Tree } from '../lib/trees'
import type { LngLat } from '../lib/geo'
import { allWishes, totalWater, useStore, useWishes, wishByPit } from '../store'
import type { Wish } from '../store/types'
import { WishCard } from '../features/wish/WishCard'
import { FeasibilityResult, WishForm, type PitInfo } from '../features/wish/WishForm'
import { Art } from '../components/ui'
import { assetUrl } from '../assets'
import { useBalance } from '../features/game/ledger'
import { EventBar } from '../features/game/EventBar'
import { useAnchor } from '../features/map/useAnchor'
import { boundsAround, circleRing } from '../lib/nearby'

type Sheet =
  | { kind: 'tree'; tree: Tree }
  | { kind: 'pit'; pit: PitInfo; justWished?: boolean }
  | { kind: 'spot'; pit: PitInfo }
  | { kind: 'wish'; wishId: string }
  | { kind: 'dlc'; which: 'trash' | 'light' }
  | null

type LayerKey = 'trees' | 'pits' | 'wishes' | 'parks'

/** 地圖上次的位置，從樹的頁面回來時接著看（全市模式） */
let lastView: { center: LngLat; zoom: number } | null = null

/** 附近：45° 俯視、只能在目前位置半徑內移動；全市：平面、可看整個台北 */
type Mode = 'near' | 'city'
let lastMode: Mode = 'near'

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
  const [gap, setGap] = useState<{ high: District; low: District } | null>(null)
  const [gapOpen, setGapOpen] = useState(true)
  const [mode, setModeState] = useState<Mode>(lastMode)
  const setMode = (m: Mode) => {
    lastMode = m
    setModeState(m)
  }
  const [ready, setReady] = useState(false)
  const anchor = useAnchor(mode === 'near')
  const wishes = useWishes()
  const balance = useBalance()
  const unseen = useStore((s) => s.myWishIds.concat(Object.keys(s.watered)).some((id) => {
    const w = allWishes(s).find((x) => x.id === id)
    return w && s.seen[id] !== undefined && s.seen[id] < w.history.length
  }))

  useEffect(() => {
    loadDistricts().then((ds) => {
      const high = ds.find((d) => d.district === '大安區')
      const low = ds.find((d) => d.district === '文山區')
      if (high && low) setGap({ high, low })
    })
  }, [])

  useEffect(() => {
    const base = new URL(import.meta.env.BASE_URL, location.origin).href
    const m = new maplibregl.Map({
      container: el.current!,
      style: MAP_STYLE,
      center: lastMode === 'near' ? DEMO.center : (lastView?.center ?? DEMO.center),
      zoom: lastMode === 'near' ? NEAR.zoom : (lastView?.zoom ?? DEMO.zoom),
      pitch: lastMode === 'near' ? NEAR.pitch : 0,
      bearing: lastMode === 'near' ? NEAR.bearing : 0,
      maxPitch: 60,
      attributionControl: false,
    })
    map.current = m
    ;(window as unknown as { __map: MLMap }).__map = m // 給自動化測試用
    m.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '樹木與樹穴：臺北市政府開放資料｜公園範圍：© OpenStreetMap contributors',
      }),
    )
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'bottom-right',
    )
    m.on('moveend', () => {
      if (lastMode !== 'city') return
      const c = m.getCenter()
      lastView = { center: [c.lng, c.lat], zoom: m.getZoom() }
    })
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
          'fill-extrusion-color': '#e7e2d6',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.8,
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
      m.addSource('me', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'trees',
        type: 'circle',
        source: 'trees',
        'source-layer': 'trees',
        paint: {
          'circle-color': ['match', ['get', 'k'], 'p', '#5f9e6e', '#3f7d4e'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 2, 17, 5, 19, 9],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 0.85],
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
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 17, 2],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 17, 6, 19, 10],
        },
      })
      m.addLayer({
        id: 'me',
        type: 'circle',
        source: 'me',
        paint: {
          'circle-color': '#2f7de1',
          'circle-radius': 7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 3,
          'circle-pitch-alignment': 'map',
        },
      })
      setReady(true)
    })
    m.on('click', (e) => {
      const pad = 10
      const box: [PointLike, PointLike] = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad],
      ]
      const layersNow = ['pits', 'trees'].filter((l) => m.getLayer(l) && m.getLayoutProperty(l, 'visibility') !== 'none')
      const hit = m.queryRenderedFeatures(box, { layers: layersNow })[0]
      if (!hit) return setSheet(null)
      if (hit.layer.id === 'trees') {
        findTree(hit.properties.id as string).then((tree) => tree && setSheet({ kind: 'tree', tree }))
      } else {
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
    // 長按（或右鍵）任意位置許願：不是樹穴，初審為「需會勘」
    const wishAt = (point: maplibregl.Point, lngLat: maplibregl.LngLat) => {
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
    m.on('contextmenu', (e) => wishAt(e.point, e.lngLat))
    let press: ReturnType<typeof setTimeout> | undefined
    m.on('touchstart', (e) => {
      if (e.points.length !== 1) return
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

  // 附近／全市模式：鏡頭角度與可移動範圍
  const centeredOn = useRef<string | null>(null)
  const anchorRef = useRef(anchor)
  anchorRef.current = anchor
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const nearby = m.getSource('nearby') as maplibregl.GeoJSONSource | undefined
    const me = m.getSource('me') as maplibregl.GeoJSONSource | undefined
    if (mode === 'city') {
      centeredOn.current = null
      m.setMaxBounds(null)
      m.setMinZoom(10)
      nearby?.setData({ type: 'FeatureCollection', features: [] })
      me?.setData({ type: 'FeatureCollection', features: [] })
      m.easeTo({ pitch: 0, bearing: 0, zoom: Math.min(m.getZoom(), 15), duration: 600 })
      return
    }
    const key = `${anchor.source}:${anchor.lngLat.join()}`
    nearby?.setData({ type: 'Polygon', coordinates: [circleRing(anchor.lngLat, NEAR.radiusMeters)] })
    me?.setData(
      anchor.source === 'gps'
        ? { type: 'Point', coordinates: anchor.lngLat }
        : { type: 'FeatureCollection', features: [] },
    )
    m.setMaxBounds(null)
    m.setMinZoom(NEAR.minZoom)
    if (centeredOn.current !== key) {
      // 進附近模式、或人移動了：鏡頭移到新的中心。上一段動畫可能被打斷，所以角度與縮放用「至少」而不是沿用目前值
      centeredOn.current = key
      m.easeTo({
        center: anchor.lngLat,
        zoom: Math.max(m.getZoom(), NEAR.minZoom),
        pitch: m.getPitch() < 30 ? NEAR.pitch : m.getPitch(),
        bearing: m.getPitch() < 30 ? NEAR.bearing : m.getBearing(),
        duration: 700,
      })
      // 動畫結束才鎖範圍，並用最新的中心（避免被打斷的動畫拿到舊位置）
      m.once('moveend', () => {
        if (lastMode === 'near') m.setMaxBounds(boundsAround(anchorRef.current.lngLat, NEAR.radiusMeters))
      })
    } else {
      m.setMaxBounds(boundsAround(anchor.lngLat, NEAR.radiusMeters))
    }
  }, [mode, anchor, ready])

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
      node.onclick = (ev) => {
        ev.stopPropagation()
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

  const sheetWish: Wish | undefined = sheet?.kind === 'wish' ? wishes.find((w) => w.id === sheet.wishId) : undefined

  return (
    <div className="map-page">
      <div ref={el} className="map" />

      <header className="map-top">
        <Art id="logo" alt="曦語 Whisper Trees" className="logo" />
        <nav className="row gap">
          <Link className="btn small light balance-chip" to="/me" aria-label={`我的小芽，${balance} 光點`}>
            <Art id="glow" alt="" className="icon sm" />
            {balance}
          </Link>
          <Link className="btn small light" to="/wishes">
            我的許願{unseen && <span className="dot-badge" aria-label="有新進度" />}
          </Link>
          <Link className="btn small light" to="/more">
            更多
          </Link>
          <button className="btn small light" onClick={() => setPanel((p) => !p)} aria-expanded={panel}>
            圖層
          </button>
        </nav>
      </header>
      <div className="map-event">
        <EventBar />
      </div>

      {gap && gapOpen && (
        <div className="gap-card">
          <p>
            <strong>{gap.high.district}</strong>每公里人行道的行道樹，是<strong>{gap.low.district}</strong>的{' '}
            <strong>{(gap.high.trees_per_km / gap.low.trees_per_km).toFixed(1)}</strong> 倍
          </p>
          <p className="muted small">
            全市 162,406 棵樹・16,781 個候選空樹穴（{gap.high.trees_per_km} vs {gap.low.trees_per_km} 棵/公里）
          </p>
          <button className="close" onClick={() => setGapOpen(false)} aria-label="關閉">
            ×
          </button>
        </div>
      )}

      {panel && (
        <div className="layer-panel">
          {(
            [
              ['trees', '樹木', 'legend-tree'],
              ['pits', '候選空樹穴', 'legend-pit'],
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
            🗑️ 垃圾桶 <span className="dlc-tag">DLC 即將推出</span>
          </button>
          <button className="dlc-option" onClick={() => setSheet({ kind: 'dlc', which: 'light' })}>
            💡 路燈 <span className="dlc-tag">DLC 即將推出</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="sheet" role="dialog">
          <button className="close" onClick={() => setSheet(null)} aria-label="關閉">
            ×
          </button>
          {sheet.kind === 'tree' && <TreeSheet tree={sheet.tree} />}
          {sheet.kind === 'pit' && (
            <div>
              <div className="row gap center-v">
                <Art id="empty-pit" alt="" className="icon" />
                <div>
                  <h2>候選空樹穴</h2>
                  <p className="muted small">
                    {sheet.pit.district} {sheet.pit.road}
                  </p>
                </div>
              </div>
              <p className="small">在這裡許願種樹，之後別人來可以幫你澆水。</p>
              <p className="muted small">其他位置想要一棵樹？在地圖上長按就能許願。</p>
              <WishForm pit={sheet.pit} onDone={(w) => setSheet({ kind: 'wish', wishId: w.id })} />
            </div>
          )}
          {sheet.kind === 'spot' && (
            <div>
              <h2>在這裡許願種樹</h2>
              <p className="muted small">
                {sheet.pit.district || '這個位置'} {sheet.pit.road}・不是既有樹穴，市府要先會勘
              </p>
              <WishForm pit={sheet.pit} onDone={(w) => setSheet({ kind: 'wish', wishId: w.id })} />
            </div>
          )}
          {sheet.kind === 'wish' && sheetWish && (
            <div>
              {!sheetWish.mock && sheetWish.history.length === 1 && Date.now() - sheetWish.createdAt < 60_000 && (
                <FeasibilityResult wish={sheetWish} />
              )}
              <WishCard wish={sheetWish} />
            </div>
          )}
          {sheet.kind === 'dlc' && <DlcCard which={sheet.which} />}
        </div>
      )}

      {!sheet && (
        <div className="mode-toggle" role="group" aria-label="地圖模式">
          <button className={mode === 'near' ? 'on' : ''} aria-pressed={mode === 'near'} onClick={() => setMode('near')}>
            附近
          </button>
          <button className={mode === 'city' ? 'on' : ''} aria-pressed={mode === 'city'} onClick={() => setMode('city')}>
            全市
          </button>
          {mode === 'near' && (
            <span className="mode-note">
              {anchor.source === 'gps'
                ? `你周圍 ${NEAR.radiusMeters} 公尺`
                : anchor.source === 'demo'
                  ? '示範樹周圍（Demo）'
                  : '沒有定位：示範樹周圍'}
            </span>
          )}
        </div>
      )}

      {!sheet && (
        <Link className="scan-fab" to="/scan">
          掃樹牌
        </Link>
      )}
    </div>
  )
}

function TreeSheet({ tree }: { tree: Tree }) {
  return (
    <div>
      <h2>{tree.species}</h2>
      <p className="muted small">
        {tree.district} {tree.place}
        {tree.remark && `（${tree.remark}）`}
      </p>
      <dl className="facts inline">
        <dt>樹高</dt>
        <dd>{tree.height ?? '—'} m</dd>
        <dt>胸徑</dt>
        <dd>{tree.diameter ?? '—'} cm</dd>
      </dl>
      <Link className="btn primary block" to={`/tree/${tree.id}`}>
        去這棵樹
      </Link>
      <p className="muted small">從地圖點進去只能看，要打卡請掃樹牌。</p>
    </div>
  )
}

function DlcCard({ which }: { which: 'trash' | 'light' }) {
  return which === 'trash' ? (
    <div>
      <h2>
        🗑️ 垃圾桶 <span className="dlc-tag">DLC 即將推出</span>
      </h2>
      <p>回報滿溢、依行人流量與通報熱點建議佈點（對應 debug 松題目 #2）。</p>
      <p className="muted small">沿用同一套「市民回報 × 後台營運 × 政府資料」。目前只是預告，還沒有圖層。</p>
    </div>
  ) : (
    <div>
      <h2>
        💡 路燈 <span className="dlc-tag">DLC 即將推出</span>
      </h2>
      <p>回報路燈故障。公園處的「行道樹路燈資訊網」本來就把行道樹和路燈放在同一個系統。</p>
      <p className="muted small">目前只是預告，還沒有圖層。</p>
    </div>
  )
}

