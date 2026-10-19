import { useEffect, useRef } from 'react'
import type { Map as MLMap } from 'maplibre-gl'
import { dragBearing, normalizeBearing, pointerAngle, ROTATE_STEP } from './rotation'

const KEY_STEP = 5

/**
 * 沒有指南針的裝置（桌機）用的旋轉控制：左轉／右轉各 15°，加上可以拖曳的羅盤圈（像 Google Earth）。
 * bearing 是地圖目前的方位角（由 MapPage 的 rotate 事件更新）。
 */
export function RotationControl({ map, bearing, onClose }: { map: MLMap | null; bearing: number; onClose: () => void }) {
  const ringRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startBearing: number; startAngle: number } | null>(null)
  const target = useRef(0)
  const current = normalizeBearing(bearing)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const step = (delta: number) => {
    if (!map) return
    // 連按時從上一次的目標接著轉，不會因為動畫還沒結束而漏掉
    const base = map.isRotating() ? target.current : map.getBearing()
    target.current = base + delta
    map.easeTo({ bearing: target.current, duration: 300 })
  }

  const angleAt = (e: React.PointerEvent) => {
    const r = ringRef.current!.getBoundingClientRect()
    return pointerAngle(r.left + r.width / 2, r.top + r.height / 2, e.clientX, e.clientY)
  }

  return (
    <div className="rotate-panel" role="group" aria-label="旋轉地圖" data-testid="rotate-panel">
      <div className="rotate-head">
        <strong>旋轉地圖</strong>
        <button className="rotate-close" onClick={onClose} aria-label="關閉旋轉控制">
          ×
        </button>
      </div>
      <div
        ref={ringRef}
        className="rotate-ring"
        data-testid="rotate-ring"
        role="slider"
        tabIndex={0}
        aria-label="羅盤圈：拖曳可旋轉地圖，也可以用左右方向鍵"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(current) % 360}
        aria-valuetext={`朝向 ${Math.round(current) % 360} 度`}
        onPointerDown={(e) => {
          if (!map) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { startBearing: normalizeBearing(map.getBearing()), startAngle: angleAt(e) }
        }}
        onPointerMove={(e) => {
          if (!map || !drag.current) return
          map.setBearing(dragBearing(drag.current.startBearing, drag.current.startAngle, angleAt(e)))
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -KEY_STEP : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? KEY_STEP : 0
          if (!d) return
          e.preventDefault()
          step(d)
        }}
      >
        <svg viewBox="-60 -60 120 120" aria-hidden style={{ transform: `rotate(${-current}deg)` }}>
          <circle r="54" className="rotate-disc" />
          {Array.from({ length: 24 }, (_, i) => (
            <line key={i} y1="-54" y2={i % 6 === 0 ? -46 : -50} transform={`rotate(${i * 15})`} className="rotate-tick" />
          ))}
          <path d="M0 -40l7 14h-14z" className="rotate-north" />
          <text y="-13" textAnchor="middle" className="rotate-n">
            北
          </text>
        </svg>
        <span className="rotate-deg" aria-hidden>
          {Math.round(current) % 360}°
        </span>
      </div>
      <div className="rotate-steps">
        <button className="btn small" data-testid="rotate-left" aria-label={`地圖左轉 ${ROTATE_STEP} 度`} onClick={() => step(-ROTATE_STEP)}>
          ↺ 左轉
        </button>
        <button className="btn small" data-testid="rotate-right" aria-label={`地圖右轉 ${ROTATE_STEP} 度`} onClick={() => step(ROTATE_STEP)}>
          右轉 ↻
        </button>
      </div>
      <p className="rotate-tip">右鍵拖曳或按住 Control 拖曳，也能旋轉和傾斜</p>
    </div>
  )
}
