import { describe, expect, it } from 'vitest'
import { CHECKIN } from '../../../config'
import { checkinRadius, judgeCheckin, offsetNorth, type LngLat } from '../../../lib/geo'
import { ringRadius, treesInRing } from '../ring'

const tree: LngLat = [121.5287, 25.0335]

describe('checkinRadius', () => {
  it('is nearMeters plus accuracy, capped by maxAccuracyBonus', () => {
    expect(checkinRadius(0)).toBe(CHECKIN.nearMeters)
    expect(checkinRadius(5)).toBe(CHECKIN.nearMeters + 5)
    expect(checkinRadius(1000)).toBe(CHECKIN.nearMeters + CHECKIN.maxAccuracyBonus)
  })
})

describe('judgeCheckin uses checkinRadius', () => {
  for (const accuracy of [0, 5, 12, 30, 80]) {
    it(`accuracy ${accuracy}: success just inside, too far just outside`, () => {
      const r = checkinRadius(accuracy)
      const pos = (m: number) => ({ lngLat: offsetNorth(tree, m), accuracy })
      expect(judgeCheckin(tree, '', pos(r - 0.5)).kind).toBe('success')
      expect(judgeCheckin(tree, '', pos(r + 0.5)).kind).toBe('tooFar')
    })
  }
})

describe('ringRadius', () => {
  it('has no ring for fallback', () => {
    expect(ringRadius({ source: 'fallback' })).toBeNull()
  })
  it('demo uses the demo accuracy (about 35 m)', () => {
    expect(ringRadius({ source: 'demo' })).toBe(checkinRadius(CHECKIN.demoAccuracy))
    expect(ringRadius({ source: 'demo' })).toBe(35)
  })
  it('gps uses the reported accuracy, same radius the check-in judgment uses', () => {
    for (const accuracy of [3, 20, 90]) {
      expect(ringRadius({ source: 'gps', accuracy })).toBe(checkinRadius(accuracy))
    }
  })
})

describe('treesInRing', () => {
  it('keeps trees inside, drops outside and duplicates', () => {
    const features = [
      { id: 'A', lngLat: offsetNorth(tree, 10) },
      { id: 'A', lngLat: offsetNorth(tree, 10) },
      { id: 'B', lngLat: offsetNorth(tree, 34) },
      { id: 'C', lngLat: offsetNorth(tree, 36) },
    ]
    expect(treesInRing(features, tree, 35).map((f) => f.id)).toEqual(['A', 'B'])
  })
})
