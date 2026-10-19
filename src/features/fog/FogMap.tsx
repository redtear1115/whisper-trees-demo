import { useEffect, useRef } from 'react'
import type { Map as MLMap } from 'maplibre-gl'
import { MAP_LOCALE, maplibregl, applyChineseLabels } from '../../lib/maplibre'
import { MAP_STYLE } from '../../config'
import type { LngLat } from '../../lib/geo'
import { FOG_RADIUS_M, TAIPEI_BBOX, clearPixelRadius, clearedBounds, formatArea } from './fog'
import { useFog } from './useFog'

// 霧的顏色：從 --paper / --green-soft 調出來的淡灰綠，半透明，底圖的街道還隱約看得到
const FOG_COLOR = 'rgba(224, 231, 220, 0.9)'

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

/**
 * 迷霧地圖：整個台北蓋一層霧，打卡過的樹周圍 50 m 散開。
 * 霧是疊在地圖上的 canvas（每個影格重畫）：先塗滿霧，再用 destination-out 把圓挖掉。
 * 這樣圓和圓重疊也不會出錯（多邊形挖洞法在洞重疊時會畫壞），圓的邊緣是柔的，
 * 縮放時邊緣永遠清楚。地圖固定俯角 0、不能旋轉，所以公尺換像素是單一比例。
 */
export function FogMap({ height = 320 }: { height?: number | string }) {
  const { count, areaKm2, centers, loading } = useFog()
  const mapEl = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const map = useRef<MLMap | null>(null)
  const latest = useRef<LngLat[]>(centers)
  latest.current = centers
  const ready = useRef(false)
  const redraw = useRef<() => void>(() => {})

  useEffect(() => {
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
    map.current = m
    ;(window as unknown as { __fogMap: MLMap }).__fogMap = m // 給自動化測試用
    m.touchZoomRotate.disableRotation()
    m.touchPitch.disable()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(new maplibregl.AttributionControl({ compact: true }))

    const sprite = makeSprite()

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
      g.globalCompositeOperation = 'destination-out'
      for (const p of latest.current) {
        const s = m.project(p)
        if (s.x < -r || s.y < -r || s.x > w + r || s.y > h + r) continue
        g.drawImage(sprite, s.x - r, s.y - r, 2 * r, 2 * r)
      }
    }
    redraw.current = draw // 圓更新時從 effect 外面重畫

    m.on('render', draw)
    m.once('load', () => {
      applyChineseLabels(m)
      ready.current = true
      fit(m, latest.current)
    })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(mapEl.current!)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      ready.current = false
    }
  }, [])

  // 圓更新：重畫，並把畫面移到清出的範圍
  const key = centers.length
  useEffect(() => {
    const m = map.current
    if (!m) return
    redraw.current()
    if (ready.current) fit(m, centers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const empty = !loading && centers.length === 0

  return (
    <div className="fog" data-testid="fog-map" style={{ height }}>
      <div ref={mapEl} className="fog-map" />
      <canvas ref={canvas} className="fog-canvas" aria-hidden="true" />
      <p
        className="fog-stat"
        data-testid="fog-stat"
        data-count={count}
        data-area={areaKm2.toFixed(4)}
      >
        {loading ? (
          '正在整理探索範圍…'
        ) : (
          <>
            已探索 <strong>{count}</strong> 棵樹周圍
            {count > 0 && <span>，約 {formatArea(areaKm2)} 平方公里</span>}
          </>
        )}
      </p>
      {empty && (
        <p className="fog-empty" data-testid="fog-empty">
          打卡過的樹周圍，霧會散開。
        </p>
      )}
    </div>
  )
}

function fit(m: MLMap, centers: LngLat[]) {
  const b = clearedBounds(centers)
  if (b) {
    m.fitBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      { padding: 48, maxZoom: 15.5, duration: 0 },
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
