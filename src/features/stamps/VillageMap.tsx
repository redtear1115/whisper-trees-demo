import { useMemo } from 'react'
import type { DistrictVillages, Village } from '../../lib/villages'
import { PANEL_BG, RAMP_STEPS, villageFill, villageText } from './colors'
import { CrayonDefs } from './Crayon'
import { fitProjection, labelFits, unionBBox, villageLabel, villagePath, type BBox } from './projection'

/** 里名字級（SVG 單位；畫布寬 360，手機上約 1:1 px） */
const LABEL_FS = 11

/**
 * 里的完成度地圖：以該區範圍投影，每個里依「點亮的樹 ÷ 里內的樹」像印泥一樣上色（0 棵是空白紙格，有 1 棵就看得出變化）。
 * 里很小（有的不到 20 px），所以地圖是給「看」和「用手點」的；鍵盤與讀屏走旁邊的里列表（VillageList），
 * 地圖本身不進 Tab 順序，也對讀屏隱藏，避免 50 幾個停靠點。名字放得下才顯示。
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
      <svg viewBox={`0 0 ${shapes.proj.width} ${shapes.proj.height}`} aria-hidden="true" style={{ backgroundColor: PANEL_BG }}>
        <CrayonDefs id="atlas-crayon-village" unitsPerPx={shapes.proj.width / 340} />
        <g filter="url(#atlas-crayon-village)">
          {items.map(({ v, d }) => {
            const n = lit.get(v.id) ?? 0
            return (
              <path
                key={v.id}
                d={d}
                fillRule="evenodd"
                className={`atlas-region ${pickedId === v.id ? 'on' : ''}`}
                fill={villageFill(n, v.total)}
                data-testid={`village-${v.id}`}
                data-lit={n}
                data-total={v.total}
                onClick={() => onPick(v)}
              />
            )
          })}
        </g>
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
            >
              {v.name}
            </text>
          ) : null,
        )}
      </svg>
      <div className="atlas-legend atlas-ramp" role="group" aria-label="圖例">
        <span>還沒點亮</span>
        <span className="atlas-ramp-steps" aria-hidden="true">
          {RAMP_STEPS.map((st) => (
            <i key={st.from} style={{ background: st.fill }} />
          ))}
        </span>
        <span>點亮越多越深</span>
      </div>
    </div>
  )
}
