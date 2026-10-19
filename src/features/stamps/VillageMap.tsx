import { useMemo } from 'react'
import type { DistrictVillages, Village } from '../../lib/villages'
import { PANEL_BG, RAMP_STOPS, rampColor, villageFill, villageText } from './colors'
import { fitProjection, labelFits, unionBBox, villageLabel, villagePath, type BBox } from './projection'

/** 里名字級（SVG 單位；畫布寬 360，手機上約 1:1 px） */
const LABEL_FS = 11

/**
 * 里的完成度地圖：以該區範圍投影，每個里依「點亮的樹 ÷ 里內的樹」上色（0 棵暗色，有 1 棵就看得出變化）。
 * 每個里是一個按鈕；名字放得下才顯示（放不下點了在卡片上看）。
 */
export function VillageMap({
  data,
  lit,
  pickedId,
  onPick,
}: {
  data: DistrictVillages
  lit: ReadonlyMap<string, number>
  pickedId: string | null
  onPick: (v: Village) => void
}) {
  const shapes = useMemo(() => {
    const box = unionBBox(data.villages.map((v) => v.bbox as BBox))
    if (!box) return null
    const proj = fitProjection(box)
    return {
      proj,
      items: data.villages.map((v) => {
        const label = villageLabel(v, proj)
        return { v, d: villagePath(v, proj), label, showName: labelFits(v.name, label, LABEL_FS) }
      }),
    }
  }, [data])
  if (!shapes) return null
  // 選到的里畫在最上面
  const items = [...shapes.items].sort((a, b) => Number(a.v.id === pickedId) - Number(b.v.id === pickedId))

  return (
    <div className="atlas-panel village-map" data-testid="village-map">
      <svg viewBox={`0 0 ${shapes.proj.width} ${shapes.proj.height}`} role="group" aria-label={`${data.district}的里地圖`} style={{ background: PANEL_BG }}>
        {items.map(({ v, d }) => {
          const n = lit.get(v.id) ?? 0
          const on = pickedId === v.id
          return (
            <path
              key={v.id}
              d={d}
              fillRule="evenodd"
              className={`atlas-region ${on ? 'on' : ''}`}
              fill={villageFill(n, v.total)}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${v.name}：已點亮 ${n}／${v.total} 棵`}
              data-testid={`village-${v.id}`}
              data-lit={n}
              data-total={v.total}
              onClick={() => onPick(v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(v)
                }
              }}
            />
          )
        })}
        {items.map(({ v, label, showName }) =>
          showName && label ? (
            <text
              key={v.id}
              x={label.x}
              y={label.y}
              className="atlas-label"
              style={{ fontSize: LABEL_FS, fill: villageText(lit.get(v.id) ?? 0, v.total), strokeWidth: 2, stroke: villageFill(lit.get(v.id) ?? 0, v.total) }}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {v.name}
            </text>
          ) : null,
        )}
      </svg>
      <div className="atlas-legend atlas-ramp" aria-label="圖例">
        <span>還沒點亮</span>
        <i
          aria-hidden="true"
          style={{ background: `linear-gradient(90deg, ${RAMP_STOPS.map((_, i) => rampColor(i / (RAMP_STOPS.length - 1))).join(',')})` }}
        />
        <span>點亮越多越亮</span>
      </div>
    </div>
  )
}
