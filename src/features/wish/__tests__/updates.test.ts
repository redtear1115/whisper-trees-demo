import { describe, expect, it } from 'vitest'
import { hasUnseenWishUpdate, unseenWishUpdateCount } from '../updates'
import type { Wish } from '../../../store/types'

const wish = (id: string, statuses: Wish['history'][number]['status'][]): Wish => ({
  id,
  pitId: null,
  lngLat: [121.5, 25.03],
  road: '測試路',
  district: '中正區',
  reasons: ['太曬'],
  feasibility: 'needsSurvey',
  createdAt: 1,
  seedWater: 0,
  water: 0,
  history: statuses.map((status, i) => ({ status, at: i + 1 })),
  mock: false,
})

describe('citizen wish progress notifications', () => {
  it('does not notify for the initial received event on a new device', () => {
    expect(hasUnseenWishUpdate(wish('a', ['received']))).toBe(false)
  })

  it('notifies on a new device when government added progress', () => {
    expect(hasUnseenWishUpdate(wish('a', ['received', 'surveying']))).toBe(true)
  })

  it('counts only the signed-in citizen own unseen wishes', () => {
    const wishes = [wish('mine', ['received', 'surveying']), wish('other', ['received', 'scheduled']), wish('seen', ['received', 'surveying'])]
    expect(unseenWishUpdateCount(wishes, ['mine', 'seen'], { seen: 2 })).toBe(1)
  })
})
