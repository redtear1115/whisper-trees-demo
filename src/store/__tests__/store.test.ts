import { beforeEach, describe, expect, it } from 'vitest'
import {
  addWhisper, allWishes, createWish, resetAll, setWishStatus, totalWater, waterWish, whispersOf, wishByPit, wishStatus,
} from '..'

beforeEach(() => resetAll())

describe('wishes', () => {
  it('one wish per pit; second visitor waters instead', () => {
    const a = createWish({ pitId: 'p1', lngLat: [121, 25], road: 'x', district: '中正區', reasons: ['太曬'], feasibility: 'emptyPit' })
    const b = createWish({ pitId: 'p1', lngLat: [121, 25], road: 'x', district: '中正區', reasons: ['通學'], feasibility: 'emptyPit' })
    expect(b.id).toBe(a.id)
    expect(wishByPit('p1')?.reasons).toEqual(['太曬'])
  })
  it('water once per day', () => {
    const w = allWishes()[0]
    const before = totalWater(w)
    expect(waterWish(w.id)).toBe(true)
    expect(waterWish(w.id)).toBe(false)
    expect(totalWater(allWishes().find((x) => x.id === w.id)!)).toBe(before + 1)
  })
  it('rejected needs a reason', () => {
    const w = allWishes()[0]
    expect(setWishStatus(w.id, 'rejected', '  ')).toBe(false)
    expect(setWishStatus(w.id, 'rejected', '地下管線')).toBe(true)
    const now = allWishes().find((x) => x.id === w.id)!
    expect(wishStatus(now)).toBe('rejected')
    expect(now.history.at(-1)?.reason).toBe('地下管線')
  })
})

describe('whispers', () => {
  it('are kept per tree and capped at 140 chars', () => {
    addWhisper('AA0000000001', 'x'.repeat(200))
    expect(whispersOf('AA0000000001')[0].text.length).toBe(140)
    expect(whispersOf('AA0000000002')).toEqual([])
  })
})
