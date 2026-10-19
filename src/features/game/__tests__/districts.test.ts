import { readFileSync, readdirSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { getState, recordCheckin, resetAll, setExt } from '../../../store'
import { TAIPEI_DISTRICTS, type Checkin, type Wish } from '../../../store/types'
import { award, adjust, baseLedger, spend } from '../ledger'
import { saveGameConfig } from '../config'
import {
  PREFIX_DISTRICT,
  districtOfTreeId,
  earnedStampsNewestFirst,
  lightByDistrict,
  parseLedgerKey,
  progressText,
  stampBook,
} from '../districts'

const noon = new Date('2026-10-19T12:00:00+08:00')
const DAY = 86_400_000

function ck(treeId: string, at: number, result: Checkin['result'] = 'success'): Checkin {
  return { treeId, result, at }
}
/** 大安區的第 i 棵樹 */
const da = (i: number) => `DA${String(i).padStart(10, '0')}`
const bookOf = (cs: Checkin[]) => Object.fromEntries(stampBook(cs).map((b) => [b.district, b]))

beforeEach(() => resetAll())

describe('prefix mapping', () => {
  it('covers 12 prefixes and 12 districts', () => {
    expect(Object.keys(PREFIX_DISTRICT)).toHaveLength(12)
    expect(new Set(Object.values(PREFIX_DISTRICT))).toEqual(new Set(TAIPEI_DISTRICTS))
  })
  it('maps by 2-letter prefix, ignoring the -001 suffix; unknown is null', () => {
    expect(districtOfTreeId('SL0560111023')).toBe('士林區')
    expect(districtOfTreeId('SL0560111023-001')).toBe('士林區')
    expect(districtOfTreeId('ZZ0000000001')).toBeNull()
    expect(districtOfTreeId('')).toBeNull()
  })
  it('matches the real data: each public/data/trees/<prefix>.json is mostly its district', () => {
    const dir = 'public/data/trees'
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    expect(files.map((f) => f.slice(0, 2)).sort()).toEqual(Object.keys(PREFIX_DISTRICT).sort())
    for (const f of files) {
      const rows = Object.values(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).trees) as unknown[][]
      const counts = new Map<string, number>()
      for (const r of rows) counts.set(r[9] as string, (counts.get(r[9] as string) ?? 0) + 1)
      const major = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      expect(PREFIX_DISTRICT[f.slice(0, 2)], f).toBe(major)
    }
  })
})

describe('stampBook', () => {
  it('always has 12 districts, all empty with no check-ins', () => {
    const book = stampBook([])
    expect(book.map((b) => b.district)).toEqual([...TAIPEI_DISTRICTS])
    expect(book.every((b) => b.distinct === 0 && b.top === null && b.next?.id === 'iron')).toBe(true)
  })
  it('counts the same tree once, and farView counts like success', () => {
    const b = bookOf([ck(da(1), 1000), ck(da(1), 2000), ck(da(2), 3000, 'farView')]).大安區
    expect(b.distinct).toBe(2)
    expect(b.top?.id).toBe('iron')
  })
  it('treats TreeIDs with a suffix as different trees (whole-string compare)', () => {
    expect(bookOf([ck('DA0000000001', 1), ck('DA0000000001-001', 2)]).大安區.distinct).toBe(2)
  })
  it('ignores trees with an unknown prefix', () => {
    expect(stampBook([ck('ZZ0000000001', 1)]).every((b) => b.distinct === 0)).toBe(true)
  })
  it('tier thresholds are 1 / 10 / 50 / 200', () => {
    const upto = (n: number) => bookOf(Array.from({ length: n }, (_, i) => ck(da(i), i + 1))).大安區
    expect(upto(1).top?.id).toBe('iron')
    expect(upto(9).top?.id).toBe('iron')
    expect(upto(10).top?.id).toBe('bronze')
    expect(upto(49).top?.id).toBe('bronze')
    expect(upto(50).top?.id).toBe('silver')
    expect(upto(199).top?.id).toBe('silver')
    expect(upto(200).top?.id).toBe('gold')
    expect(upto(200).next).toBeNull()
    expect(upto(200).earned.map((e) => e.tier.id)).toEqual(['iron', 'bronze', 'silver', 'gold'])
  })
  it('earnedAt is the first check-in of the Nth distinct tree (repeat visits and order do not matter)', () => {
    // 故意亂序、重複：第 10 棵不同的樹第一次出現在 at=10 * DAY
    const cs: Checkin[] = []
    for (let i = 1; i <= 10; i++) cs.push(ck(da(i), i * DAY))
    cs.push(ck(da(3), 99 * DAY), ck(da(1), 0.5 * DAY))
    const b = bookOf(cs.reverse()).大安區
    // da(1) 最早的一次是 0.5 天；之後依第一次出現排序，第 10 棵是 da(10) @ 10 天
    expect(b.earned.find((e) => e.tier.id === 'iron')?.earnedAt).toBe(0.5 * DAY)
    expect(b.earned.find((e) => e.tier.id === 'bronze')?.earnedAt).toBe(10 * DAY)
  })
  it('districts are independent', () => {
    const b = bookOf([ck('SL0000000001', 5), ck(da(1), 6)])
    expect(b.士林區.distinct).toBe(1)
    expect(b.大安區.distinct).toBe(1)
    expect(b.北投區.distinct).toBe(0)
  })
  it('progressText', () => {
    const cs = Array.from({ length: 7 }, (_, i) => ck(da(i), i + 1))
    expect(progressText(bookOf(cs).大安區)).toBe('7／10，再 3 棵拿銅章')
    expect(progressText(bookOf([]).大安區)).toBe('0／1，再 1 棵拿鐵章')
    expect(progressText(bookOf(Array.from({ length: 200 }, (_, i) => ck(da(i), i + 1))).大安區)).toBe('200 棵，已集滿金章')
  })
  it('earnedStampsNewestFirst sorts by time descending', () => {
    const cs = [ck('SL0000000001', 100), ck(da(1), 300), ck('BT0000000001', 200)]
    expect(earnedStampsNewestFirst(stampBook(cs)).map((e) => e.district)).toEqual(['大安區', '北投區', '士林區'])
  })
  it('works from real store check-ins', () => {
    recordCheckin('DA0000000001', 'success')
    recordCheckin('DA0000000001', 'success')
    expect(stampBook(getState().checkins)[TAIPEI_DISTRICTS.indexOf('大安區')].distinct).toBe(1)
  })
})

describe('parseLedgerKey', () => {
  it('parses action:key:day', () => {
    expect(parseLedgerKey('checkin:SL0560111023:2026-10-19')).toEqual({ action: 'checkin', key: 'SL0560111023', day: '2026-10-19' })
    expect(parseLedgerKey('water:pit-123:2026-10-19')).toEqual({ action: 'water', key: 'pit-123', day: '2026-10-19' })
  })
  it('keeps a key that contains colons (first segment = action, last = day)', () => {
    expect(parseLedgerKey('wish:spot:abc:1:2026-10-19')).toEqual({ action: 'wish', key: 'spot:abc:1', day: '2026-10-19' })
  })
  it('rejects missing, malformed and unknown-action keys', () => {
    expect(parseLedgerKey(undefined)).toBeNull()
    expect(parseLedgerKey('')).toBeNull()
    expect(parseLedgerKey('checkin')).toBeNull()
    expect(parseLedgerKey('checkin:2026-10-19')).toBeNull()
    expect(parseLedgerKey('nope:T1:2026-10-19')).toBeNull()
    expect(parseLedgerKey('toString:T1:2026-10-19')).toBeNull()
    expect(parseLedgerKey(':T1:2026-10-19')).toBeNull()
  })
})

describe('lightByDistrict', () => {
  const wishes: Pick<Wish, 'id' | 'district' | 'road'>[] = [
    { id: 'w-1', district: '文山區', road: '木新路' },
    { id: 'w-bad', district: '火星區', road: '？' },
  ]

  // 這裡只測歸屬，不測點數：關掉日照與寂寞樹倍率，數字才固定
  beforeEach(() => saveGameConfig({ sunMax: 1, lonelyDays: 100_000 }))

  it('attributes tree actions by prefix and wish/water by the wish district', () => {
    award('checkin', 'DA0000000001', noon)
    // 2026-10-20 前的流水帳有獨立的 sun 紀錄（現在日照是倍率，不再單獨發）；舊資料仍要歸到行政區
    setExt('ledger', [...baseLedger(), { at: noon.getTime(), delta: 2, reason: '白天打卡的日照加成', key: 'sun:DA0000000001:2026-10-19' }])
    award('whisper', 'SL0000000001-001', noon)
    award('wish', 'w-1', noon)
    award('water', 'w-1', noon)
    const m = lightByDistrict(baseLedger(), wishes)
    expect(m.get('大安區')?.total).toBe(12)
    expect(m.get('大安區')?.items.map((i) => i.action).sort()).toEqual(['checkin', 'sun'])
    expect(m.get('大安區')?.items[0].treeId).toBe('DA0000000001')
    expect(m.get('士林區')?.total).toBe(2)
    expect(m.get('士林區')?.items[0].treeId).toBe('SL0000000001-001')
    expect(m.get('文山區')?.total).toBe(8)
    expect(m.get('文山區')?.items.every((i) => i.wishRoad === '木新路' && i.treeId === undefined)).toBe(true)
  })

  it('excludes spend, GM adjustments (not in the base ledger), unknown wishes and unknown prefixes', () => {
    award('checkin', 'DA0000000001', noon)
    spend(5, '買東西')
    adjust(100, '客服補發')
    award('wish', 'w-bad', noon)
    award('water', 'w-missing', noon)
    award('checkin', 'ZZ0000000001', noon)
    const m = lightByDistrict(baseLedger(), wishes)
    expect([...m.keys()]).toEqual(['大安區'])
    expect(m.get('大安區')?.total).toBe(10)
  })

  it('excludes entries without a key or with a malformed one', () => {
    const m = lightByDistrict(
      [
        { at: 1, delta: 10, reason: 'x' },
        { at: 2, delta: 10, reason: 'x', key: 'garbage' },
        { at: 3, delta: 10, reason: 'x', key: 'checkin:DA0000000001:2026-10-19' },
      ],
      [],
    )
    expect(m.get('大安區')?.items).toHaveLength(1)
  })

  it('lists newest first', () => {
    const m = lightByDistrict(
      [
        { at: 1, delta: 10, reason: 'x', key: 'checkin:DA0000000001:2026-10-18' },
        { at: 5, delta: 10, reason: 'x', key: 'checkin:DA0000000002:2026-10-19' },
      ],
      [],
    )
    expect(m.get('大安區')?.items.map((i) => i.at)).toEqual([5, 1])
  })
})
