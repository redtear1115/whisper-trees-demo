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

/** 「花掉也不會變小」的安心話要怎麼說：花過（流水帳有負的）用過去式；手上有光點但還沒花過，說「之後」；都沒有就不說 */
export type SpendNote = 'past' | 'future' | null

export function spendNoteKind(a: { balance: number; spent: boolean }): SpendNote {
  if (a.spent) return 'past'
  return a.balance > 0 ? 'future' : null
}

/** 2026-10-21 critique：剛拿到第一份光點就看到「光點花掉了」，會以為被扣了，所以沒花過的人改說「之後」 */
const SPEND_NOTE: Record<Exclude<SpendNote, null>, string> = {
  past: '光點花掉了，小芽也不會變小。',
  future: '之後用光點換東西，小芽也不會變小。',
}

/**
 * 小芽的成長文案。溫和往前看：不說「再 N 光點」，也不放壓力。earned 是累計獲得（花掉不會變少）。
 * spendNote：「花掉也不會變小」的安心話（spendNoteKind）；null 不放。
 */
export function growthCopy(earned: number, spendNote: SpendNote = null): GrowthCopy {
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
      note: spendNote ? SPEND_NOTE[spendNote] : '',
      percent,
      valuetext: `小芽是${stage.name}，等著第一道光`,
    }
  }
  return {
    headline,
    line: `一路收集了 ${earned} 光點，小芽正慢慢長向「${next.name}」。`,
    note: spendNote ? SPEND_NOTE[spendNote] : '',
    percent,
    valuetext: `小芽是${stage.name}，正長向${next.name}，已走了 ${percent}%`,
  }
}

/** 三個階段的路：每一階走到了沒、是不是現在這一階（「我的」的成長條下面標出來） */
export function stagePath(earned: number): { stage: Stage; reached: boolean; current: boolean }[] {
  const { stage } = stageOf(earned)
  return STAGES.map((s) => ({ stage: s, reached: earned >= s.min, current: s.id === stage.id }))
}
