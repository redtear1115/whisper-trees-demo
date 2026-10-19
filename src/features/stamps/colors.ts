// 集章冊地圖的配色：深色底、綠色系，由暗到亮 = 未開始 → 鐵 → 銅 → 銀 → 金。
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
  { key: 'none', name: '未開始', fill: '#3d4d43', text: '#e9efe6' },
  { key: 'iron', name: '鐵章', fill: '#5a7f62', text: '#ffffff' },
  { key: 'bronze', name: '銅章', fill: '#86aa72', text: '#17251b' },
  { key: 'silver', name: '銀章', fill: '#bcd8b6', text: '#17251b' },
  { key: 'gold', name: '金章', fill: '#ecdc8e', text: '#2b2410' },
]

export function toneOf(tier: Tier['id'] | null | undefined): TierTone {
  return TIER_TONES.find((t) => t.key === (tier ?? 'none')) ?? TIER_TONES[0]
}

/** 地圖面板底色與外圍（新北、基隆） */
export const PANEL_BG = '#26332b'
export const NEIGHBOUR_FILL = '#2f3d34'

// ---------- 里：完成度色階 ----------

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** 色階三個停靠點：還沒點亮（=未開始）→ 中 → 亮 */
export const RAMP_STOPS: RGB[] = [hex('#3d4d43'), hex('#6f9a6a'), hex('#e3efc0')]

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

export function rampColor(t: number): string {
  const u = Math.min(1, Math.max(0, t)) * (RAMP_STOPS.length - 1)
  const i = Math.min(RAMP_STOPS.length - 2, Math.floor(u))
  const f = u - i
  const a = RAMP_STOPS[i]
  const b = RAMP_STOPS[i + 1]
  return toHex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f])
}

/** 里的填色；沒有樹的里（total 0）和 0 棵一樣是暗色 */
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
