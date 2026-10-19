import { describe, expect, it } from 'vitest'
import { ledgerRow, newestRows, treeLabel, wishLabel } from '../ledgerRows'

describe('ledgerRow', () => {
  it('reads the tree id from a checkin key', () => {
    const r = ledgerRow({ at: 1, delta: 10, reason: '打卡成功', key: 'checkin:SY0011410001:2026-10-19' })
    expect(r.treeId).toBe('SY0011410001')
    expect(r.wishId).toBeUndefined()
  })
  it('keeps the -001 suffix of a tree id whole', () => {
    expect(ledgerRow({ at: 1, delta: 3, reason: '留樹洞', key: 'whisper:SY0011410001-001:2026-10-19' }).treeId).toBe(
      'SY0011410001-001',
    )
  })
  it('wish and water keys point at a wish, not a tree', () => {
    expect(ledgerRow({ at: 1, delta: 5, reason: '許願', key: 'wish:w-abc:2026-10-19' })).toMatchObject({
      wishId: 'w-abc',
    })
    expect(ledgerRow({ at: 1, delta: 2, reason: '澆水', key: 'water:w-abc:2026-10-19' }).treeId).toBeUndefined()
  })
  it('rows without a usable key (spending, GM top-up, junk) link nowhere', () => {
    for (const key of [undefined, '', 'nonsense', 'bogus:x:2026-10-19']) {
      const r = ledgerRow({ at: 1, delta: -30, reason: '買帽子', key })
      expect(r.treeId).toBeUndefined()
      expect(r.wishId).toBeUndefined()
    }
  })
})

describe('newestRows', () => {
  const entries = [1, 2, 3, 4, 5].map((at) => ({ at, delta: 10, reason: '打卡成功', key: `checkin:T${at}:2026-10-19` }))
  it('is newest first and honours the limit', () => {
    expect(newestRows(entries, 3).map((r) => r.at)).toEqual([5, 4, 3])
    expect(newestRows(entries).length).toBe(5)
    expect(newestRows([], 3)).toEqual([])
  })
})

describe('labels', () => {
  it('names the tree by species and road', () => {
    expect(treeLabel({ species: '榕樹', place: '忠孝東路四段' })).toBe('榕樹・忠孝東路四段')
    expect(treeLabel({ species: '榕樹', place: '' })).toBe('榕樹')
    expect(treeLabel(null)).toBeNull()
  })
  it('names the wish by its road', () => {
    expect(wishLabel({ road: '信義路五段' })).toBe('信義路五段的願望')
    expect(wishLabel({ road: '' })).toBeNull()
    expect(wishLabel(undefined)).toBeNull()
  })
})
