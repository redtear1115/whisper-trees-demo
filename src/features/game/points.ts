// 在樹旁的光點怎麼算：純函式，不碰 store。規則表見 docs/specs/08-extensions.md §1。
// 團隊簡報 v17 第 19、23 頁。

import { ACTION_LABEL, type GameConfig } from './config'

export type TreeAction = 'checkin' | 'farView' | 'whisper' | 'report'

export interface TreePointsInput {
  action: TreeAction
  /** 這是這棵樹今天的第幾個互動（含這一個；打卡、遠觀、樹洞、回報各算一個） */
  slot: number
  /** 今天第幾棵不同的樹打卡（含這一棵）；只有打卡與遠觀看這個 */
  treeOrder: number
  /** 日照倍率，1 以上（夜間是 1） */
  daylight: number
  /** 距離上次有人拜訪幾天（模擬，或自己更近的一次） */
  lonelyDays: number
  /** 受保護樹木 */
  protectedTree: boolean
  /** 活動倍率（沒活動是 1） */
  eventMult: number
}

export interface TreePoints {
  delta: number
  /** 套用了哪些規則，依序（給流水帳的原因用；沒有加成就是空的） */
  parts: string[]
}

/** 寂寞樹倍率：沒到門檻是 1；剛到門檻 lonelyMin，之後每多 lonelyStepDays 天加 1，最高 lonelyMax */
export function lonelyFactor(days: number, cfg: Pick<GameConfig, 'lonelyDays' | 'lonelyMin' | 'lonelyMax' | 'lonelyStepDays'>): number {
  if (!(days >= cfg.lonelyDays)) return 1
  const steps = Math.floor((days - cfg.lonelyDays) / Math.max(1, cfg.lonelyStepDays))
  return Math.min(cfg.lonelyMax, cfg.lonelyMin + steps)
}

export function calcTreePoints(input: TreePointsInput, cfg: GameConfig): TreePoints {
  const global = cfg.multiplier * input.eventMult
  const parts: string[] = []

  // 樹況回報：固定點數，不受同棵樹第幾個互動、日照、寂寞樹影響（它是幫城市，不是陪樹）
  if (input.action === 'report') {
    return { delta: Math.round(cfg.points.report * global), parts }
  }

  // 樹洞不是「靠近一棵樹」，最多算第 2 個互動（沒打卡就留樹洞的邊角情形）
  const slot = input.action === 'whisper' ? Math.max(2, input.slot) : input.slot
  if (slot >= 4) return { delta: 0, parts }

  let base: number
  if (slot === 1) {
    const prot = input.action === 'checkin' && input.protectedTree
    base = input.action === 'farView' ? cfg.points.farView : prot ? cfg.protectedBase : cfg.points.checkin
    if (prot) parts.push(`受保護樹木 基礎 ${cfg.protectedBase}`)
  } else {
    base = slot === 2 ? cfg.ladder2 : cfg.ladder3
    parts.push(`同一棵樹第 ${slot} 個互動`)
  }

  let factor = global
  const lonely = lonelyFactor(input.lonelyDays, cfg)
  if (lonely > 1) {
    factor *= lonely
    parts.push(`寂寞樹 ×${lonely}（模擬）`)
  }
  if (input.daylight > 1.04) {
    factor *= input.daylight
    parts.push(`日照 ×${input.daylight.toFixed(1)}`)
  }
  const halved = slot === 1 && input.treeOrder >= cfg.halveFrom
  if (halved) {
    factor *= 0.5
    parts.push(`今天第 ${input.treeOrder} 棵起減半`)
  }
  return { delta: Math.round(base * factor), parts }
}

/** 流水帳的原因：「打卡成功・寂寞樹 ×3（模擬）・日照 ×1.5」 */
export function reasonOf(action: TreeAction, parts: string[], eventName?: string): string {
  return [ACTION_LABEL[action], ...parts, ...(eventName ? [eventName] : [])].join('・')
}
