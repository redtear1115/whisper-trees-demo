import { describe, expect, it } from 'vitest'
import type { Wish } from '../../../store/types'
import { nearbyWishes } from '../nearbyWishes'

const wish = (id: string, lngLat: [number, number]): Wish => ({
  id, pitId: null, lngLat, road: '', district: '大安區', reasons: ['太曬'], feasibility: 'needsSurvey', createdAt: 0, seedWater: 0, water: 0, history: [], mock: false,
})

describe('nearbyWishes', () => {
  const c: [number, number] = [121.52, 25.03]
  it('keeps others within the radius, nearest first, and leaves out my own', () => {
    const list = [wish('far', [121.53, 25.03]), wish('mine', [121.5201, 25.03]), wish('b', [121.5205, 25.03]), wish('a', [121.5202, 25.03])]
    const out = nearbyWishes(list, ['mine'], c, 300)
    expect(out.map((r) => r.wish.id)).toEqual(['a', 'b'])
    expect(out[0].distance).toBeGreaterThan(15)
    expect(out[0].distance).toBeLessThan(25)
  })
  it('is empty when nothing is near', () => {
    expect(nearbyWishes([wish('far', [121.6, 25.1])], [], c, 300)).toEqual([])
  })
})
