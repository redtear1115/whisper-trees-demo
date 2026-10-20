// 摸摸樹：在樹旁做的三種小事（呼吸、冥想、擁抱）。拉近畫面的「摸摸樹」點開後選一種，做完記一筆日記、算一個互動。
// 時間的計算是純函式，畫面（TouchPanel）每秒問一次。規格：docs/specs/02-map.md「摸摸樹」。

import type { TouchId } from '../journal/diary'

export interface TouchKind {
  id: TouchId
  name: string
  /** 選擇時的一句說明 */
  blurb: string
}

export const TOUCHES: readonly TouchKind[] = [
  { id: 'breathe', name: '呼吸', blurb: '跟著樹葉，吸四拍、吐四拍，三輪' },
  { id: 'meditate', name: '冥想', blurb: '安靜一分鐘，聽聽樹在說什麼' },
  { id: 'hug', name: '擁抱', blurb: '張開手臂，輕輕抱一下樹幹' },
]

/** 呼吸：吸 4 秒、吐 4 秒，共 3 輪 */
export const BREATH = { inMs: 4000, outMs: 4000, rounds: 3 }
/** 冥想：一分鐘 */
export const MEDITATE_MS = 60_000

export interface BreathPhase {
  /** 第幾輪（1 起）；做完是 rounds */
  round: number
  phase: 'in' | 'out'
  done: boolean
}

/** 開始後經過 elapsedMs，現在是第幾輪的吸或吐 */
export function breathPhase(elapsedMs: number, b = BREATH): BreathPhase {
  const cycle = b.inMs + b.outMs
  const total = cycle * b.rounds
  if (!(elapsedMs < total)) return { round: b.rounds, phase: 'out', done: true }
  const t = Math.max(0, elapsedMs)
  return { round: Math.floor(t / cycle) + 1, phase: t % cycle < b.inMs ? 'in' : 'out', done: false }
}

/** 冥想還剩幾秒（無條件進位；做完是 0） */
export function meditateLeft(elapsedMs: number, total = MEDITATE_MS): number {
  return Math.max(0, Math.ceil((total - Math.max(0, elapsedMs)) / 1000))
}
