// 示範（模擬）資料：預先放的許願、回報、樹洞膠囊。兩個後端共用，畫面上都標「模擬」。

import seedWishes from '../mock/wishes.json'
import capsules from '../mock/capsules.json'
import seedReports from '../mock/reports.json'
import type { TreeReport, Wish, WishStatus } from './types'

export const DAY = 86_400_000

interface SeedWish {
  id: string
  pitId: string | null
  lngLat: [number, number]
  road: string
  district: string
  reasons: string[]
  feasibility: Wish['feasibility']
  daysAgo: number
  seedWater: number
  history: (string | number)[][]
}

export const seedNow = Date.now()

export const SEED: Wish[] = (seedWishes as SeedWish[]).map((w) => ({
  id: w.id,
  pitId: w.pitId,
  lngLat: w.lngLat,
  road: w.road,
  district: w.district,
  reasons: w.reasons,
  feasibility: w.feasibility,
  createdAt: seedNow - w.daysAgo * DAY,
  seedWater: w.seedWater,
  water: 0,
  history: w.history.map(([status, days, reason]) => ({
    status: status as WishStatus,
    at: seedNow - (days as number) * DAY,
    ...(reason ? { reason: reason as string } : {}),
  })),
  mock: true,
}))

export const SEED_REPORTS: TreeReport[] = (seedReports as (Omit<TreeReport, 'at'> & { daysAgo: number })[]).map(
  ({ daysAgo, ...r }) => ({ ...r, at: seedNow - daysAgo * DAY, mock: true }),
)

export const capsuleSeed = capsules as unknown as Record<string, { text: string; daysAgo: number }>
