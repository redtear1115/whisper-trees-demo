// 補種優先分數，規則見 docs/specs/06-gov-console.md

export type Feasibility = 'emptyPit' | 'wideSidewalk' | 'needsSurvey'

export const FEASIBILITY_VALUE: Record<Feasibility, number> = {
  emptyPit: 1,
  wideSidewalk: 0.6,
  needsSurvey: 0.3,
}

export interface Weights {
  demand: number
  shade: number
  feasibility: number
  fairness: number
}

export const DEFAULT_WEIGHTS: Weights = { demand: 25, shade: 25, feasibility: 25, fairness: 25 }

export interface ScoreInput {
  waterings: number
  /** 所在行政區每公里行道樹數 */
  treesPerKm: number
  feasibility: Feasibility
}

export interface ScoreParts {
  demand: number
  shade: number
  feasibility: number
  fairness: number
  total: number
}

/**
 * 每項先正規化到 0–1，再依權重加權平均。total 也是 0–1。
 * districtsPerKm 是全市各行政區的每公里行道樹數，用來正規化遮蔭缺口與公平性。
 */
export function scoreAll(items: ScoreInput[], weights: Weights, districtsPerKm: number[]): ScoreParts[] {
  const maxLogWater = Math.max(0, ...items.map((i) => Math.log1p(i.waterings)))
  const min = Math.min(...districtsPerKm)
  const max = Math.max(...districtsPerKm)
  const sorted = [...districtsPerKm].sort((a, b) => a - b)
  const third = Math.ceil(sorted.length / 3)
  const weightSum = weights.demand + weights.shade + weights.feasibility + weights.fairness

  return items.map((i) => {
    const demand = maxLogWater > 0 ? Math.log1p(i.waterings) / maxLogWater : 0
    const shade = max > min ? (max - i.treesPerKm) / (max - min) : 0
    // 公平性：最缺蔭的三分之一行政區 1 分，中間 0.5 分，其餘 0 分
    const rank = sorted.findIndex((v) => v >= i.treesPerKm)
    const fairness = rank < 0 ? 0 : rank < third ? 1 : rank < third * 2 ? 0.5 : 0
    const feasibility = FEASIBILITY_VALUE[i.feasibility]
    const total =
      weightSum > 0
        ? (demand * weights.demand +
            shade * weights.shade +
            feasibility * weights.feasibility +
            fairness * weights.fairness) /
          weightSum
        : 0
    return { demand, shade, feasibility, fairness, total }
  })
}
