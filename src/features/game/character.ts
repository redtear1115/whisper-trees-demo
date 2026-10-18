// 角色「小芽」：依累計獲得的光點長大，花掉不會變小。

export interface Stage {
  id: string
  name: string
  min: number
  art: string
}

export const STAGES: Stage[] = [
  { id: 'seed', name: '種子', min: 0, art: 'sprout-0' },
  { id: 'sprout', name: '發芽', min: 30, art: 'sprout-1' },
  { id: 'sapling', name: '小樹苗', min: 100, art: 'sprout-2' },
  { id: 'young', name: '小樹', min: 250, art: 'sprout-3' },
  { id: 'grown', name: '大樹', min: 500, art: 'sprout-4' },
]

export function stageOf(earned: number): { stage: Stage; next?: Stage; progress: number } {
  let i = 0
  while (i + 1 < STAGES.length && earned >= STAGES[i + 1].min) i++
  const stage = STAGES[i]
  const next = STAGES[i + 1]
  const progress = next ? (earned - stage.min) / (next.min - stage.min) : 1
  return { stage, next, progress }
}
