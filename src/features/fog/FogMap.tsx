import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Map as MLMap } from 'maplibre-gl'
import { toneBasemap } from '../map/basemapTone'
import { MAP_LOCALE, maplibregl, applyChineseLabels } from '../../lib/maplibre'
import { MAP_STYLE } from '../../config'
import type { LngLat } from '../../lib/geo'
import { Art } from '../../components/ui'
import { FOG_RADIUS_M, TAIPEI_BBOX, clearPixelRadius, fogActions, fogAllView, fogView, formatArea, type FogMode } from './fog'
import { useFog } from './useFog'

/** 底圖超過這麼久還沒載好，就當作載入失敗 */
const MAP_LOAD_TIMEOUT_MS = 20_000

// 霧的顏色：從 --paper / --green-soft 調出來的淡灰綠，半透明，底圖的街道還隱約看得到
const FOG_COLOR = 'rgba(224, 231, 220, 0.9)'
// 散開處的暖光：--glow（#f2c14e）疊在霧上，像燈籠照出來的一圈；中央再被挖空
const GLOW_RGB = '242, 193, 78'
/** 暖光的半徑是散開半徑的幾倍 */
const GLOW_SCALE = 1.7

/** 柔邊的圓（中心完全透明、邊緣漸層），先畫一次，之後用 drawImage 縮放貼上 */
function makeSprite(): HTMLCanvasElement {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.6, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

/** 暖光的圓：中央最亮、往外淡出；畫在霧上面，之後中央被挖掉，只剩外圈的一圈光 */
function makeGlow(): HTMLCanvasElement {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(${GLOW_RGB}, 0.8)`)
  grad.addColorStop(0.5, `rgba(${GLOW_RGB}, 0.6)`)
  grad.addColorStop(1, `rgba(${GLOW_RGB}, 0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

/**
 * 探索頁的迷霧區：依狀態顯示地圖、空狀態卡、或錯誤。
 * 空狀態不載入地圖（沒有東西可看，也省下底圖流量）。
 */
export function FogMap({ height = 320 }: { height?: number | string }) {
  const fog = useFog()
  if (fog.loading)
    return (
      <div className="fog fog-pending" data-testid="fog-pending" style={{ height }}>
        <p className="fog-stat" role="status">
          正在整理探索範圍…
        </p>
      </div>
    )
  if (fog.failed)
    return (
      <div className="fog-card fog-error" data-testid="fog-error" role="alert">
        <div className="fog-card-body">
          <h3 className="fog-card-title">探索範圍暫時查不到</h3>
          <p className="muted">查不到你打卡過的樹的位置，多半是網路不穩。</p>
          <button className="btn primary" data-testid="fog-retry" onClick={fog.retry}>
            再試一次
          </button>
        </div>
      </div>
    )
  if (fog.count === 0)
    return (
      <div className="fog-card" data-testid="fog-empty">
        <Art id="fog-empty" alt="" className="fog-card-art" />
        <div className="fog-card-body">
          <h3 className="fog-card-title">霧還沒散開</h3>
          <p>打卡過的樹周圍，霧會散開。</p>
          <p className="muted small" data-testid="fog-stat" data-count="0" data-area="0.0000">
            已探索 <strong>0</strong> 棵樹周圍
          </p>
          <Link className="btn primary" to="/" data-testid="fog-find-tree">
            去找一棵樹
          </Link>
        </div>
      </div>
    )
  return <FogView height={height} centers={fog.centers} count={fog.count} areaKm2={fog.areaKm2} />
}

/**
 * 迷霧地圖：整個台北蓋一層霧，打卡過的樹周圍 50 m 散開。
 * 霧是疊在地圖上的 canvas（每個影格重畫）：先塗滿霧，再用 destination-out 把圓挖掉。
 * 這樣圓和圓重疊也不會出錯（多邊形挖洞法在洞重疊時會畫壞），圓的邊緣是柔的，
 * 縮放時邊緣永遠清楚。地圖固定俯角 0、不能旋轉，所以公尺換像素是單一比例。
 */
function FogView({
  height,
  centers,
  count,
  areaKm2,
}: {
  height: number | string
  centers: LngLat[]
  count: number
  areaKm2: number
}) {
  const mapEl = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const map = useRef<MLMap | null>(null)
  const latest = useRef<LngLat[]>(centers)
  latest.current = centers
  const ready = useRef(false)
  const redraw = useRef<() => void>(() => {})
  const [mode, setMode] = useState<FogMode>('focus')
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const view = fogView(centers)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    setLoadFailed(false)
    const m = new maplibregl.Map({
      container: mapEl.current!,
      style: MAP_STYLE,
      bounds: TAIPEI_BBOX,
      pitch: 0,
      bearing: 0,
      maxBounds: [
        [TAIPEI_BBOX[0] - 0.04, TAIPEI_BBOX[1] - 0.04],
        [TAIPEI_BBOX[2] + 0.04, TAIPEI_BBOX[3] + 0.04],
      ],
      maxZoom: 17,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
      locale: MAP_LOCALE,
    })
    toneBasemap(m) // 和首頁同一套暖色紙面底圖
    map.current = m
    ;(window as unknown as { __fogMap: MLMap }).__fogMap = m // 給自動化測試用
    m.touchZoomRotate.disableRotation()
    m.touchPitch.disable()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(new maplibregl.AttributionControl({ compact: true }))

    const sprite = makeSprite()
    const glow = makeGlow()

    const draw = () => {
      const cv = canvas.current
      if (!cv) return
      const w = cv.clientWidth
      const h = cv.clientHeight
      const dpr = window.devicePixelRatio || 1
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      const g = cv.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.globalCompositeOperation = 'source-over'
      g.clearRect(0, 0, w, h)
      g.fillStyle = FOG_COLOR
      g.fillRect(0, 0, w, h)
      // 公尺換像素：量地圖中心往東 100 m 是幾個像素（俯角 0、不旋轉，全市差不到 1%）
      const c = m.getCenter()
      const a = m.project([c.lng, c.lat])
      const b = m.project([c.lng + 100 / (111_320 * Math.cos((c.lat * Math.PI) / 180)), c.lat])
      const mPerPx = 100 / Math.max(Math.abs(b.x - a.x), 1e-6)
      const r = clearPixelRadius(FOG_RADIUS_M, mPerPx)
      const rg = r * GLOW_SCALE
      const onScreen = (s: { x: number; y: number }) => !(s.x < -rg || s.y < -rg || s.x > w + rg || s.y > h + rg)
      // 先在霧上疊暖光，再把圓挖掉：圓內是乾淨的底圖，圓外緣留一圈光，圓和圓重疊也不會互相蓋住
      for (const p of latest.current) {
        const s = m.project(p)
        if (onScreen(s)) g.drawImage(glow, s.x - rg, s.y - rg, 2 * rg, 2 * rg)
      }
      g.globalCompositeOperation = 'destination-out'
      for (const p of latest.current) {
        const s = m.project(p)
        if (onScreen(s)) g.drawImage(sprite, s.x - r, s.y - r, 2 * r, 2 * r)
      }
    }
    redraw.current = draw // 圓更新時從 effect 外面重畫

    m.on('render', draw)
    // 底圖（樣式）載不進來：載入前出錯，或太久沒好
    let loaded = false
    const fail = () => {
      if (!loaded) setLoadFailed(true)
    }
    m.on('error', fail)
    const timer = window.setTimeout(fail, MAP_LOAD_TIMEOUT_MS)
    m.once('load', () => {
      loaded = true
      window.clearTimeout(timer)
      setLoadFailed(false)
      applyChineseLabels(m)
      ready.current = true
      fit(m, latest.current, modeRef.current)
    })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(mapEl.current!)
    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
      m.remove()
      map.current = null
      ready.current = false
    }
  }, [attempt])

  // 圓更新、或切換看哪裡：重畫，並把畫面移到該看的地方
  const key = centers.length
  useEffect(() => {
    const m = map.current
    if (!m) return
    redraw.current()
    if (ready.current) fit(m, centers, mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode])

  return (
    <div className="fog" data-testid="fog-map" style={{ height }}>
      <div ref={mapEl} className="fog-map" />
      <canvas ref={canvas} className="fog-canvas" aria-hidden="true" />
      <p className="fog-stat" data-testid="fog-stat" data-count={count} data-area={areaKm2.toFixed(4)}>
        已探索 <strong>{count}</strong> 棵樹周圍
        {count > 0 && <span>，約 {formatArea(areaKm2)} 平方公里</span>}
      </p>
      <div className="fog-actions">
        {fogActions(mode, view).map((a) => (
          <button key={a.to} type="button" className="btn small light" data-testid={`fog-go-${a.to}`} onClick={() => setMode(a.to)}>
            {a.label}
          </button>
        ))}
      </div>
      {loadFailed && (
        <div className="fog-card fog-error fog-overlay" data-testid="fog-error" role="alert">
          <div className="fog-card-body">
            <h3 className="fog-card-title">底圖載入失敗</h3>
            <p className="muted">檢查網路後再試一次。</p>
            <button className="btn primary" data-testid="fog-retry" onClick={() => setAttempt((n) => n + 1)}>
              再試一次
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 該看哪裡：我走過的地方（散得很開時只框最密的一帶，見 fogView）、全部走過的地方，或全市 */
function fit(m: MLMap, centers: LngLat[], mode: FogMode) {
  const view = mode === 'city' ? null : mode === 'all' ? fogAllView(centers) : fogView(centers)
  if (view) {
    const [w, s, e, n] = view.bounds
    m.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 40, maxZoom: view.maxZoom, duration: 0 },
    )
  } else {
    m.fitBounds(
      [
        [TAIPEI_BBOX[0], TAIPEI_BBOX[1]],
        [TAIPEI_BBOX[2], TAIPEI_BBOX[3]],
      ],
      { padding: 0, duration: 0 },
    )
  }
}

export default FogMap
