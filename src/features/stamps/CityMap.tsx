import { useMemo } from 'react'
import type { Outline } from '../../lib/outline'
import { PREFIX_DISTRICT, shortName, type District, type DistrictStamps } from '../game/districts'
import { NEIGHBOUR_FILL, PANEL_BG, TIER_TONES, toneOf } from './colors'
import { boundsOf, labelPoint, parseRings } from './svgPath'

const PREFIX_OF = Object.fromEntries(Object.entries(PREFIX_DISTRICT).map(([p, d]) => [d, p])) as Record<District, string>

/** 台北市外框外多留的邊（SVG 單位，1 單位 = 20 公尺） */
const MARGIN = 70
/** 區名字級（手機上約 12 px：viewBox 寬度換算） */
const LABEL_PX = 14

/** 一區的 SVG 形狀、名字位置。純資料，隨 outline 算一次。 */
export function useCityGeometry(outline: Outline) {
  return useMemo(() => {
    const b = boundsOf(parseRings(outline.taipei)) ?? [0, 0, outline.viewBox[0], outline.viewBox[1]]
    const x = Math.max(0, b[0] - MARGIN)
    const y = Math.max(0, b[1] - MARGIN)
    const w = Math.min(outline.viewBox[0], b[2] + MARGIN) - x
    const h = Math.min(outline.viewBox[1], b[3] + MARGIN) - y
    const labels = new Map<string, [number, number]>()
    for (const [name, d] of Object.entries(outline.districts)) {
      const p = labelPoint(parseRings(d))
      if (p) labels.set(name, p)
    }
    return { viewBox: [x, y, w, h] as const, labels }
  }, [outline])
}

/**
 * 全市地圖：12 區是可以點的形狀，依集章等級上色（未開始最暗，鐵、銅、銀、金漸亮）。
 * 每一區是一個按鈕（鍵盤可操作，有 aria-label）；區名畫在形狀中央。
 */
export function CityMap({
  outline,
  book,
  picked,
  onPick,
}: {
  outline: Outline
  book: readonly DistrictStamps[]
  picked: District | null
  onPick: (d: District) => void
}) {
  const geo = useCityGeometry(outline)
  const [vx, vy, vw, vh] = geo.viewBox
  const fs = (LABEL_PX * vw) / 360
  const byDistrict = new Map(book.map((b) => [b.district, b]))
  // 選到的區畫在最上面，外框才不會被鄰居蓋住
  const names = Object.keys(outline.districts).sort((a, b) => Number(a === picked) - Number(b === picked))

  return (
    <div className="atlas-panel city-map" data-testid="city-map">
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} role="group" aria-label="台北市行政區地圖" style={{ background: PANEL_BG }}>
        <path d={outline.newtaipei} fill={NEIGHBOUR_FILL} aria-hidden="true" />
        <path d={outline.keelung} fill={NEIGHBOUR_FILL} aria-hidden="true" />
        {names.map((name) => {
          const b = byDistrict.get(name as District)
          const tone = toneOf(b?.top?.id)
          const prefix = PREFIX_OF[name as District]
          const on = picked === name
          return (
            <path
              key={name}
              d={outline.districts[name]}
              className={`atlas-region ${on ? 'on' : ''}`}
              fill={tone.fill}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${name}：${b?.top ? b.top.name : '未開始'}，${b?.distinct ?? 0} 棵`}
              data-testid={prefix ? `district-${prefix}` : undefined}
              data-tier={b?.top?.id ?? 'none'}
              data-count={b?.distinct ?? 0}
              onClick={() => onPick(name as District)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(name as District)
                }
              }}
            />
          )
        })}
        <path d={outline.taipei} className="atlas-city-edge" />
        {names.map((name) => {
          const p = geo.labels.get(name)
          if (!p) return null
          const tone = toneOf(byDistrict.get(name as District)?.top?.id)
          return (
            <text
              key={name}
              x={p[0]}
              y={p[1]}
              className="atlas-label"
              style={{ fontSize: fs, fill: tone.text, strokeWidth: fs * 0.18, stroke: tone.fill }}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {shortName(name as District)}
            </text>
          )
        })}
      </svg>
      <ul className="atlas-legend" aria-label="圖例">
        {TIER_TONES.map((t) => (
          <li key={t.key}>
            <i style={{ background: t.fill }} aria-hidden="true" />
            {t.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
