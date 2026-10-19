import { useEffect, useId, useState } from 'react'
import { loadOutline, type Outline } from '../../lib/outline'

/** 載入集章冊的背景資料；還沒載好或載入失敗都是 null（畫面照常，只是沒有背景）。 */
export function useOutline(): Outline | null {
  const [outline, setOutline] = useState<Outline | null>(null)
  useEffect(() => {
    let live = true
    loadOutline().then((o) => live && setOutline(o))
    return () => {
      live = false
    }
  }, [])
  return outline
}

/** 淡出帶的寬度（SVG 單位，1 單位 = 20 公尺） */
const FADE_UNITS = 120

/** 台北市輪廓、12 區界與鄰近的新北、基隆，畫在區卡後面。純裝飾，不接受點擊。 */
export function OutlineBackdrop({ outline }: { outline: Outline }) {
  const id = useId().replace(/:/g, '')
  const [w, h] = outline.viewBox
  return (
    <svg
      className="outline-bg"
      data-testid="outline-bg"
      viewBox={`0 0 ${outline.viewBox[0]} ${outline.viewBox[1]}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* 鄰近縣市在裁切框邊緣淡出，不要露出一條硬邊 */}
      <defs>
        <linearGradient id={`${id}x`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset={FADE_UNITS / w} stopColor="#fff" />
          <stop offset={1 - FADE_UNITS / w} stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id={`${id}y`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset={FADE_UNITS / h} stopColor="#fff" />
          <stop offset={1 - FADE_UNITS / h} stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}mx`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill={`url(#${id}x)`} />
        </mask>
        <mask id={`${id}my`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill={`url(#${id}y)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}mx)`}>
        <g mask={`url(#${id}my)`}>
          <path className="ob-neighbour" d={outline.newtaipei} />
          <path className="ob-neighbour" d={outline.keelung} />
        </g>
      </g>
      <path className="ob-taipei" d={outline.taipei} />
      {Object.entries(outline.districts).map(([name, d]) => (
        <path key={name} className="ob-district" d={d} data-district={name} />
      ))}
      <path className="ob-outline" d={outline.taipei} />
    </svg>
  )
}
