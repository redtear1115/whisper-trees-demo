// 角色「小芽」＝團隊簡報 v20（2026-10-20）p14 的樹精：依累計獲得的光點長大（不是真實樹齡），花掉不會變小。
// 3 階：初心樹精 0 → 茁壯樹精 100 → 智慧老樹精 300。

export interface Stage {
  id: string
  name: string
  min: number
  art: string
}

export const STAGES: Stage[] = [
  { id: 'novice', name: '初心樹精', min: 0, art: 'sprout-0' },
  { id: 'sturdy', name: '茁壯樹精', min: 100, art: 'sprout-1' },
  { id: 'wise', name: '智慧老樹精', min: 300, art: 'sprout-2' },
]

export function stageOf(earned: number): { stage: Stage; next?: Stage; progress: number } {
  let i = 0
  while (i + 1 < STAGES.length && earned >= STAGES[i + 1].min) i++
  const stage = STAGES[i]
  const next = STAGES[i + 1]
  const progress = next ? (earned - stage.min) / (next.min - stage.min) : 1
  return { stage, next, progress }
}

export interface GrowthCopy {
  /** 「小芽・茁壯樹精」 */
  headline: string
  /** 一句話：目前的樣子與往哪裡長（只講已經有的，不講還差多少） */
  line: string
  /** 小字補充；沒有就空字串 */
  note: string
  /** 0–100，給進度條 */
  percent: number
  /** 進度條的 aria-valuetext */
  valuetext: string
}

/** 該放安心話嗎：手上還有光點，或流水帳裡有花掉的紀錄（買過東西） */
export function shouldReassureSpend(a: { balance: number; spent: boolean }): boolean {
  return a.balance > 0 || a.spent
}

const SPEND_NOTE = '光點花掉了，小芽也不會變小。'

/**
 * 小芽的成長文案。溫和往前看：不說「再 N 光點」，也不放壓力。earned 是累計獲得（花掉不會變少）。
 * spendNote：要不要放「光點花掉了，小芽也不會變小」這句安心話。只對手上有光點、或花過光點的人說
 * （0 光點又沒買過東西的人看到會困惑：我什麼都沒花）；預設不放。
 */
export function growthCopy(earned: number, spendNote = false): GrowthCopy {
  const { stage, next, progress } = stageOf(earned)
  const headline = `小芽・${stage.name}`
  if (!next) {
    return {
      headline,
      line: `小芽已經長成${stage.name}了，謝謝你一路陪著牠。`,
      note: `一路收集了 ${earned} 光點。`,
      percent: 100,
      valuetext: `小芽已經長成${stage.name}`,
    }
  }
  const percent = Math.round(progress * 100)
  if (earned <= 0) {
    return {
      headline,
      line: `還是剛醒來的${stage.name}。收集到第一道光，牠就會慢慢長大。`,
      note: spendNote ? SPEND_NOTE : '',
      percent,
      valuetext: `小芽是${stage.name}，等著第一道光`,
    }
  }
  return {
    headline,
    line: `一路收集了 ${earned} 光點，小芽正慢慢長向「${next.name}」。`,
    note: spendNote ? SPEND_NOTE : '',
    percent,
    valuetext: `小芽是${stage.name}，正長向${next.name}，已走了 ${percent}%`,
  }
}
