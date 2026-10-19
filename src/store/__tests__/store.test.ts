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

describe('reports', () => {
  it('adds a report on top of the seeded ones', async () => {
    const { addReport, allReports } = await import('..')
    const before = allReports().length
    addReport({ treeId: 'DA0030211045', species: '茄苳', road: '信義路二段', district: '大安區', kind: 'pest', details: [], note: ' x '.repeat(100), hasPhoto: false })
    const list = allReports()
    expect(list.length).toBe(before + 1)
    expect(list[0].kind).toBe('pest')
    expect(list[0].note.length).toBeLessThanOrEqual(140)
  })
})
