import { useMemo, useRef, type ReactNode } from 'react'
import type { Outline } from '../../lib/outline'
import { PREFIX_DISTRICT, shortName, type District, type DistrictStamps } from '../game/districts'
import { NEIGHBOUR_FILL, PANEL_BG, TIER_TONES, toneOf } from './colors'
import { CrayonDefs } from './Crayon'
import { boundsOf, labelPoint, parseRings } from './svgPath'
import { DOUBLE_TAP_MS, isDoubleTap, tapPadRadius } from './tap'

export { DOUBLE_TAP_MS, isDoubleTap }

const PREFIX_OF = Object.fromEntries(Object.entries(PREFIX_DISTRICT).map(([p, d]) => [d, p])) as Record<District, string>

/** 台北市外框外多留的邊（SVG 單位，1 單位 = 20 公尺） */
const MARGIN = 70
/** 全市地圖最多佔螢幕高度的幾成：手機上下面的狀態卡標題與「我的區」摘要要在第一屏看得到（CSS 同步） */
export const CITY_MAP_VH = 0.36
/** 區名字級（手機上約 12 px：viewBox 寬度換算） */
const LABEL_PX = 14
/** 區名在畫面上最小的字級（CSS px；第五輪由 10 改 12） */
const LABEL_MIN_PX = 12

/** 一區的 SVG 形狀、名字位置。純資料，隨 outline 算一次。 */
export function useCityGeometry(outline: Outline) {
  return useMemo(() => {
    const b = boundsOf(parseRings(outline.taipei)) ?? [0, 0, outline.viewBox[0], outline.viewBox[1]]
    const x = Math.max(0, b[0] - MARGIN)
    const y = Math.max(0, b[1] - MARGIN)
    const w = Math.min(outline.viewBox[0], b[2] + MARGIN) - x
    const h = Math.min(outline.viewBox[1], b[3] + MARGIN) - y
    const labels = new Map<string, [number, number]>()
    const bounds = new Map<string, [number, number, number, number]>()
    for (const [name, d] of Object.entries(outline.districts)) {
      const rings = parseRings(d)
      const p = labelPoint(rings)
      if (p) labels.set(name, p)
      const bb = boundsOf(rings)
      if (bb) bounds.set(name, bb)
    }
    return { viewBox: [x, y, w, h] as const, labels, bounds }
  }, [outline])
}

/**
 * 全市地圖：12 區是可以點的形狀，像蓋在紙上的印泥，依集章等級上色（未開始是空白紙格，鐵、銅、銀、金漸深）。
 * 每一區是一個按鈕（鍵盤可操作，有 aria-label）；區名畫在形狀中央（手寫體）。
 * 點一下選取（看狀態卡），點兩下（或對已選的區再按 Enter）直接進里地圖。
 * 小區（例如大同）螢幕上不到 44 px，另外補一個透明的點擊圈。
 */
export function CityMap({
  outline,
  book,
  picked,
  onPick,
  onEnter,
  head,
}: {
  outline: Outline
  book: readonly DistrictStamps[]
  picked: District | null
  onPick: (d: District) => void
  /** 點兩下：進入這一區的里地圖 */
  onEnter: (d: District) => void
  /** 卡片頂端一列（集章冊放「地圖／依取得時間」切換鈕），在圖例與地圖之前 */
  head?: ReactNode
}) {
  // 自己判斷「點兩下」：iPhone 上連點兩下不一定會觸發 dblclick
  const lastTap = useRef<{ name: string; at: number } | null>(null)
  const tap = (name: District) => {
    const now = Date.now()
    const prev = lastTap.current
    lastTap.current = { name, at: now }
    onPick(name)
    if (isDoubleTap(prev, name, now)) {
      lastTap.current = null
      onEnter(name)
    }
  }
  const geo = useCityGeometry(outline)
  const [vx, vy, vw, vh] = geo.viewBox
  // 畫面上 1 個 SVG 單位約幾個螢幕像素：寬度 ≈ 容器 340 px，高度被 CITY_MAP_VH 夾住（CSS 的 .atlas-panel svg 同步）
  const vh0 = typeof window === 'undefined' ? 800 : window.innerHeight
  const pxPerUnit = Math.min(340 / vw, (vh0 * CITY_MAP_VH) / vh)
  // 區名在畫面上至少 LABEL_MIN_PX：地圖縮小時字不跟著縮到看不見
  const fs = Math.max((LABEL_PX * vw) / 360, LABEL_MIN_PX / pxPerUnit)
  const byDistrict = new Map(book.map((b) => [b.district, b]))
  // 選到的區畫在最上面，外框才不會被鄰居蓋住
  const names = Object.keys(outline.districts).sort((a, b) => Number(a === picked) - Number(b === picked))

  return (
    <div className="atlas-panel city-map" data-testid="city-map">
      {head}
      <ul className="atlas-legend" aria-label="圖例">
        {TIER_TONES.map((t) => (
          <li key={t.key}>
            <i style={{ background: t.fill }} aria-hidden="true" />
            {t.name}
          </li>
        ))}
      </ul>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} role="group" aria-label="台北市行政區地圖" style={{ backgroundColor: PANEL_BG }}>
        <CrayonDefs id="atlas-crayon-city" unitsPerPx={1 / pxPerUnit} />
        <g filter="url(#atlas-crayon-city)">
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
              aria-label={`${name}：${b?.top ? b.top.name : '還沒走過'}，${b?.distinct ?? 0} 棵`}
              data-testid={prefix ? `district-${prefix}` : undefined}
              data-tier={b?.top?.id ?? 'none'}
              data-count={b?.distinct ?? 0}
              onClick={() => tap(name as District)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (on) onEnter(name as District)
                  else onPick(name as District)
                }
              }}
            />
          )
        })}
        <path d={outline.taipei} className="atlas-city-edge" />
        </g>
        {names.map((name) => {
          const bb = geo.bounds.get(name)
          const p = geo.labels.get(name)
          const r = bb ? tapPadRadius(bb, pxPerUnit) : null
          if (!bb || !p || r === null) return null
          // 補一個至少 44 px 的透明點擊圈（只給點的人用；鍵盤與讀屏走區塊本身）
          return <circle key={name} cx={p[0]} cy={p[1]} r={r} className="atlas-tap-pad" aria-hidden="true" onClick={() => tap(name as District)} />
        })}
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
              style={{ fontSize: fs, fill: tone.text, strokeWidth: fs * 0.2, stroke: tone.fill }}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {shortName(name as District)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
