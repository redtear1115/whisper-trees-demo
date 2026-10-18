import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { maplibregl } from '../lib/maplibre'
import type { Map as MLMap, Marker, PointLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { DEMO, MAP_STYLE } from '../config'
import { findTree, loadDistricts, type District, type Tree } from '../lib/trees'
import type { LngLat } from '../lib/geo'
import { allWishes, totalWater, useStore, useWishes, wishByPit } from '../store'
import type { Wish } from '../store/types'
import { WishCard } from '../features/wish/WishCard'
import { FeasibilityResult, WishForm, type PitInfo } from '../features/wish/WishForm'
import { Art } from '../components/ui'
import { assetUrl } from '../assets'

let protocolAdded = false
function ensureProtocol() {
  if (protocolAdded) return
  maplibregl.addProtocol('pmtiles', new Protocol().tile)
  protocolAdded = true
}

type Sheet =
  | { kind: 'tree'; tree: Tree }
  | { kind: 'pit'; pit: PitInfo; justWished?: boolean }
  | { kind: 'wish'; wishId: string }
  | { kind: 'dlc'; which: 'trash' | 'light' }
  | null

type LayerKey = 'trees' | 'pits' | 'wishes'

/** 地圖上次的位置，從樹的頁面回來時接著看 */
let lastView: { center: LngLat; zoom: number } | null = null

export default function MapPage() {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ trees: true, pits: true, wishes: true })
  const [panel, setPanel] = useState(false)
  const [gap, setGap] = useState<{ high: District; low: District } | null>(null)
  const [gapOpen, setGapOpen] = useState(true)
  const wishes = useWishes()
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
    ensureProtocol()
    const base = new URL(import.meta.env.BASE_URL, location.origin).href
    const m = new maplibregl.Map({
      container: el.current!,
      style: MAP_STYLE,
      center: lastView?.center ?? DEMO.center,
      zoom: lastView?.zoom ?? DEMO.zoom,
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
      const c = m.getCenter()
      lastView = { center: [c.lng, c.lat], zoom: m.getZoom() }
    })
    m.on('load', () => {
      // 小螢幕上署名預設展開會擋住按鈕，先收起來（點 i 可展開）
      el.current?.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')
      m.addSource('trees', { type: 'vector', url: `pmtiles://${base}data/trees.pmtiles` })
      m.addSource('pits', { type: 'geojson', data: `${base}data/pits-empty.geojson` })
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
    for (const l of ['trees', 'pits']) {
      m.on('mouseenter', l, () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', l, () => (m.getCanvas().style.cursor = ''))
    }
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

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
      for (const l of ['trees', 'pits'] as const) {
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
              <WishForm pit={sheet.pit} onDone={(w) => setSheet({ kind: 'wish', wishId: w.id })} />
            </div>
          )}
          {sheet.kind === 'wish' && sheetWish && (
            <div>
              {!sheetWish.mock && sheetWish.history.length === 1 && Date.now() - sheetWish.createdAt < 60_000 && (
                <FeasibilityResult />
              )}
              <WishCard wish={sheetWish} />
            </div>
          )}
          {sheet.kind === 'dlc' && <DlcCard which={sheet.which} />}
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

