// 集章冊地圖的配色：繪本的紙面，章像印泥蓋上去，印得越深 = 章越高。
// 未開始 = 還沒蓋章的空白紙格（比紙面亮、虛線邊）→ 鐵（淡青）→ 銅（嫩綠）→ 銀（深綠）→ 金（金黃）。
// 規格見 docs/specs/08-extensions.md §10「地圖（C）」。

import type { Tier } from '../game/districts'

export type TierKey = 'none' | Tier['id']

export interface TierTone {
  key: TierKey
  name: string
  fill: string
  /** 填色上面的字色（對比 ≥ 4.5:1，單元測試驗證） */
  text: string
}

export const TIER_TONES: TierTone[] = [
  { key: 'none', name: '未開始', fill: '#fcf8ec', text: '#2c3a2e' },
  { key: 'iron', name: '鐵章', fill: '#cfe2bf', text: '#1f2a1c' },
  { key: 'bronze', name: '銅章', fill: '#9dc98c', text: '#1f2a1c' },
  { key: 'silver', name: '銀章', fill: '#5fa275', text: '#14201a' },
  { key: 'gold', name: '金章', fill: '#e8b645', text: '#2b2410' },
]

export function toneOf(tier: Tier['id'] | null | undefined): TierTone {
  return TIER_TONES.find((t) => t.key === (tier ?? 'none')) ?? TIER_TONES[0]
}

/** 地圖面板的紙色（比頁面的紙深一點，空白紙格才看得出來）與外圍（新北、基隆）的舊紙色 */
export const PANEL_BG = '#eadfc4'
export const NEIGHBOUR_FILL = '#d9cdae'
/** 區與里的邊線墨色（對每一種填色與紙面對比 ≥ 3:1，除了最深的里色階） */
export const INK_EDGE = '#4d4230'

// ---------- 里：完成度色階 ----------

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB

/**
 * 里的色階：像印泥一格一格加深。五格（不連續內插：連續內插會經過字色對比不夠的中間亮度）。
 * 第 0 格 = 還沒點亮（空白紙格）；每一格的字色都挑對比最高的（≥ 4.5:1，單元測試逐格驗證）。
 */
export const RAMP_STEPS: { from: number; fill: string }[] = [
  { from: 0, fill: '#fcf8ec' },
  { from: 0.001, fill: '#c3dcb0' },
  { from: 0.45, fill: '#8fc07f' },
  { from: 0.65, fill: '#4f9a62' },
  { from: 0.85, fill: '#2d7a46' },
]

/** 幾成的樹被點亮就滿色階（里的比例都很小，3 成已經很滿了） */
const RAMP_FULL_RATIO = 0.3
/** 只點亮 1 棵就要看得出來：色階從這裡起跳 */
const RAMP_FLOOR = 0.25

/**
 * 完成度 → 0..1 的色階位置。0 棵 = 0；有 1 棵就至少 RAMP_FLOOR（看得出變化）；
 * 其餘按對數拉開（比例都很小），達 RAMP_FULL_RATIO 以上滿格。
 */
export function rampT(lit: number, total: number): number {
  if (lit <= 0 || total <= 0) return 0
  const r = Math.min(1, lit / total)
  const k = 1000
  const x = Math.log(1 + k * r) / Math.log(1 + k * RAMP_FULL_RATIO)
  return Math.min(1, RAMP_FLOOR + (1 - RAMP_FLOOR) * x)
}

/** 色階位置 → 哪一格的顏色 */
export function rampColor(t: number): string {
  const u = Math.min(1, Math.max(0, t))
  let step = RAMP_STEPS[0]
  for (const s of RAMP_STEPS) if (u >= s.from) step = s
  return step.fill
}

/** 里的填色；沒有樹的里（total 0）和 0 棵一樣是空白紙格 */
export function villageFill(lit: number, total: number): string {
  return rampColor(rampT(lit, total))
}

/** 色階上的字色：深、淺兩種字色挑對比高的 */
export function villageText(lit: number, total: number): string {
  const bg = villageFill(lit, total)
  return contrast(DARK_TEXT, bg) >= contrast(LIGHT_TEXT, bg) ? DARK_TEXT : LIGHT_TEXT
}

const DARK_TEXT = '#0b130d'
const LIGHT_TEXT = '#ffffff'

// ---------- 對比 ----------

function lum([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG 對比值 */
export function contrast(a: string, b: string): number {
  const la = lum(hex(a))
  const lb = lum(hex(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
