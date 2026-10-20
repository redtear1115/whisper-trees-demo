import { useMemo, type ReactNode } from 'react'
import type { DistrictVillages, Village } from '../../lib/villages'
import { PANEL_BG, RAMP_STEPS, villageFill, villageText } from './colors'
import { CrayonDefs } from './Crayon'
import { fitProjection, unionBBox, villageLabel, villageNameMode, villagePath, type BBox } from './projection'

/** 里名在畫面上至少幾個螢幕像素（CSS px）。第五輪：原本 SVG 單位 11，地圖被 36svh 夾住縮小後實際只剩約 6–10 px */
const LABEL_MIN_PX = 12
/** 里地圖最多佔螢幕高度的幾成（CSS 的 .atlas-panel svg 同步） */
const VILLAGE_MAP_VH = 0.36

/**
 * 里的完成度地圖：以該區範圍投影，每個里依「點亮的樹 ÷ 里內的樹」像印泥一樣上色（0 棵是空白紙格，有 1 棵就看得出變化）。
 * 里很小（有的不到 20 px），所以地圖是給「看」和「用手點」的；鍵盤與讀屏走旁邊的里列表（VillageList），
 * 地圖本身不進 Tab 順序，也對讀屏隱藏，避免 50 幾個停靠點。名字在畫面上至少 12 px，
 * 放得下才顯示；太小放不下的里**不畫名字、也不縮小字級**（第五輪：縮到 10 px 以下讀不到），
 * 名字在旁邊的里列表裡找得到（含點亮與否），點那一塊地圖也會開卡片（見 villageNameMode）。
 */
export function VillageMap({
  data,
  lit,
  pickedId,
  onPick,
  head,
}: {
  data: DistrictVillages
  lit: ReadonlyMap<string, number>
  pickedId: string | null
  onPick: (v: Village) => void
  /** 卡片頂端一列（集章冊放「地圖／依取得時間」切換鈕），在地圖之前 */
  head?: ReactNode
}) {
  const shapes = useMemo(() => {
    const box = unionBBox(data.villages.map((v) => v.bbox as BBox))
    if (!box) return null
    const proj = fitProjection(box)
    return {
      proj,
      items: data.villages.map((v) => {
        const label = villageLabel(v, proj)
        return { v, d: villagePath(v, proj), label }
      }),
    }
  }, [data])
  if (!shapes) return null
  // 選到的里畫在最上面
  const items = [...shapes.items].sort((a, b) => Number(a.v.id === pickedId) - Number(b.v.id === pickedId))
  // 畫面上 1 個 SVG 單位約幾個螢幕像素：寬度 ≈ 容器 340 px，高度被 36svh 夾住（和 CityMap 同一種估法）
  const vh0 = typeof window === 'undefined' ? 800 : window.innerHeight
  const pxPerUnit = Math.min(340 / shapes.proj.width, (vh0 * VILLAGE_MAP_VH) / shapes.proj.height)
  const fs = LABEL_MIN_PX / pxPerUnit // SVG 單位；換回螢幕就是 12 px
  const names = items.filter(({ v, label }) => label && villageNameMode(v.name, label, fs))

  return (
    <div className="atlas-panel village-map" data-testid="village-map">
      {head}
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
        {names.map(({ v, label }) => (
          <text
            key={v.id}
            x={label!.x}
            y={label!.y}
            className="atlas-label"
            style={{
              fontSize: fs,
              fill: villageText(lit.get(v.id) ?? 0, v.total),
              strokeWidth: 2 / pxPerUnit,
              stroke: villageFill(lit.get(v.id) ?? 0, v.total),
            }}
            textAnchor="middle"
            dominantBaseline="central"
            data-testid={`village-label-${v.id}`}
          >
            {v.name}
          </text>
        ))}
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
