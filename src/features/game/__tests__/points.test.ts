import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { DEFAULT_CONFIG, gameConfig, saveGameConfig } from '../config'
import { award, awardCheckin, balance, baseLedger, daylightFactor } from '../ledger'
import { calcTreePoints, lonelyFactor, type TreePointsInput } from '../points'
import { isProtectedTree } from '../protectedTrees'
import { daysSinceVisit, mockDaysSinceVisit } from '../visits'

const DAY = 86_400_000
// 台北 2026-10-19：中午、早上 8 點、日出後不久、半夜
const noon = new Date('2026-10-19T12:00:00+08:00')
const morning = new Date('2026-10-19T08:00:00+08:00')
const dawn = new Date('2026-10-19T05:50:00+08:00')
const night = new Date('2026-10-19T23:00:00+08:00')

const cfg = DEFAULT_CONFIG
const base: TreePointsInput = {
  action: 'checkin',
  slot: 1,
  treeOrder: 1,
  daylight: 1,
  lonelyDays: 3,
  protectedTree: false,
  eventMult: 1,
}
const calc = (p: Partial<TreePointsInput>, c = cfg) => calcTreePoints({ ...base, ...p }, c)

// 這幾棵的模擬「上次有人拜訪」：T1 23 天、T2 2 天、t0 4 天、t1 104 天、T3 57 天（見 visits.ts）
beforeEach(() => resetAll())

describe('calcTreePoints (pure)', () => {
  it('approaching a tree is +10, far view +5', () => {
    expect(calc({}).delta).toBe(10)
    expect(calc({ action: 'farView' }).delta).toBe(5)
    expect(calc({}).parts).toEqual([])
  })

  it('2nd and 3rd interaction at the same tree are +2 and +1, then nothing', () => {
    expect(calc({ action: 'whisper', slot: 2 })).toMatchObject({ delta: 2, parts: ['同一棵樹第 2 個互動'] })
    expect(calc({ action: 'whisper', slot: 3 }).delta).toBe(1)
    expect(calc({ action: 'whisper', slot: 4 }).delta).toBe(0)
    // 10 + 2 + 1 = 13（簡報第 19 頁）
    expect(calc({}).delta + calc({ action: 'whisper', slot: 2 }).delta + calc({ action: 'whisper', slot: 3 }).delta).toBe(13)
  })

  it('a whisper is never the "approach" interaction', () => {
    expect(calc({ action: 'whisper', slot: 1 }).delta).toBe(2)
  })

  it('daylight is a multiplier on the check-in, not a flat +2', () => {
    expect(calc({ daylight: 1.5 })).toMatchObject({ delta: 15, parts: ['日照 ×1.5'] })
    expect(calc({ daylight: 1.2 }).delta).toBe(12)
    // 太接近 1 就不特別寫出來
    expect(calc({ daylight: 1.02 }).parts).toEqual([])
  })

  it('lonely trees multiply x2 to x5 from 30 days and say so (mock)', () => {
    expect(lonelyFactor(29, cfg)).toBe(1)
    expect(lonelyFactor(30, cfg)).toBe(2)
    expect(lonelyFactor(50, cfg)).toBe(3)
    expect(lonelyFactor(70, cfg)).toBe(4)
    expect(lonelyFactor(90, cfg)).toBe(5)
    expect(lonelyFactor(400, cfg)).toBe(5)
    const r = calc({ lonelyDays: 57 })
    expect(r.delta).toBe(30)
    expect(r.parts).toEqual(['寂寞樹 ×3（模擬）'])
  })

  it('protected trees have base 20 instead of 10 (check-in only)', () => {
    expect(calc({ protectedTree: true })).toMatchObject({ delta: 20, parts: ['受保護樹木 基礎 20'] })
    expect(calc({ protectedTree: true, action: 'farView' }).delta).toBe(5)
    expect(calc({ protectedTree: true, action: 'whisper', slot: 2 }).delta).toBe(2)
  })

  it('check-in points are halved from the 11th distinct tree of the day', () => {
    expect(calc({ treeOrder: 10 }).delta).toBe(10)
    expect(calc({ treeOrder: 11 })).toMatchObject({ delta: 5, parts: ['今天第 11 棵起減半'] })
    expect(calc({ treeOrder: 30 }).delta).toBe(5)
    // 後續互動不受影響
    expect(calc({ action: 'whisper', slot: 2, treeOrder: 11 }).delta).toBe(2)
  })

  it('a report is a flat +15, whatever the slot, daylight or lonely factor', () => {
    expect(calc({ action: 'report' })).toMatchObject({ delta: 15, parts: [] })
    expect(calc({ action: 'report', slot: 3, daylight: 1.5, lonelyDays: 90, treeOrder: 20 }).delta).toBe(15)
  })

  it('GM multiplier and event multiplier apply to everything', () => {
    const c = { ...cfg, multiplier: 2 }
    expect(calc({ eventMult: 1.5 }, c).delta).toBe(30)
    expect(calc({ action: 'report', eventMult: 1.5 }, c).delta).toBe(45)
  })

  it('GM can tune every parameter', () => {
    const c = { ...cfg, ladder2: 4, ladder3: 3, protectedBase: 50, halveFrom: 3, lonelyDays: 10, lonelyMin: 3, lonelyMax: 4, lonelyStepDays: 5, points: { ...cfg.points, report: 7 } }
    expect(calc({ action: 'whisper', slot: 2 }, c).delta).toBe(4)
    expect(calc({ action: 'whisper', slot: 3 }, c).delta).toBe(3)
    expect(calc({ protectedTree: true }, c).delta).toBe(50)
    expect(calc({ treeOrder: 3 }, c).delta).toBe(5)
    expect(lonelyFactor(10, c)).toBe(3)
    expect(lonelyFactor(15, c)).toBe(4)
    expect(lonelyFactor(99, c)).toBe(4)
    expect(calc({ action: 'report' }, c).delta).toBe(7)
  })
})

describe('daylightFactor', () => {
  it('peaks around noon, tapers toward sunrise and sunset, is 1 at night', () => {
    expect(daylightFactor(noon)).toBeGreaterThan(1.45)
    expect(daylightFactor(noon)).toBeLessThanOrEqual(1.5)
    const m = daylightFactor(morning)
    expect(m).toBeGreaterThan(1.1)
    expect(m).toBeLessThan(daylightFactor(noon))
    expect(daylightFactor(dawn)).toBeLessThan(1.15)
    expect(daylightFactor(night)).toBe(1)
    expect(daylightFactor(new Date('2026-10-19T03:00:00+08:00'))).toBe(1)
  })
  it('follows the GM maximum', () => {
    expect(daylightFactor(noon, 2)).toBeGreaterThan(1.9)
    expect(daylightFactor(noon, 1)).toBe(1)
  })
})

describe('mock "last visited" (labelled 模擬)', () => {
  it('is deterministic per tree id', () => {
    for (const id of ['T1', 'SL0560111023', 'DA0030211041-001']) {
      expect(mockDaysSinceVisit(id)).toBe(mockDaysSinceVisit(id))
    }
    expect(mockDaysSinceVisit('T1')).toBe(23)
    expect(mockDaysSinceVisit('T3')).toBe(57)
  })
  it('about a fifth of trees are lonely (30 to 120 days); the rest were visited within 29 days', () => {
    let lonely = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      const d = mockDaysSinceVisit(`BT${String(i).padStart(10, '0')}`)
      expect(d).toBeGreaterThanOrEqual(1)
      expect(d).toBeLessThanOrEqual(120)
      if (d >= 30) lonely++
    }
    expect(lonely / n).toBeGreaterThan(0.15)
    expect(lonely / n).toBeLessThan(0.3)
  })
  it("uses the user's own earlier visit when it is newer, but never today's", () => {
    const now = noon
    const yesterday = now.getTime() - DAY
    const today = now.getTime() - 3600_000
    expect(daysSinceVisit('T3', [], now)).toEqual({ days: 57, source: 'mock' })
    expect(daysSinceVisit('T3', [{ treeId: 'T3', at: yesterday }], now)).toEqual({ days: 1, source: 'own' })
    // 自己的比模擬的更久以前 → 還是用模擬的
    expect(daysSinceVisit('T2', [{ treeId: 'T2', at: now.getTime() - 40 * DAY }], now)).toEqual({ days: 2, source: 'mock' })
    // 今天的打卡不算
    expect(daysSinceVisit('T3', [{ treeId: 'T3', at: today }], now)).toEqual({ days: 57, source: 'mock' })
    // 別棵樹的不算
    expect(daysSinceVisit('T3', [{ treeId: 'T9', at: yesterday }], now).days).toBe(57)
  })
})

describe('protected trees', () => {
  it('there is no protected-tree list in the open data, so none is active', () => {
    expect(isProtectedTree('SL0560111023')).toBe(false)
    expect(awardCheckin('SL0560111023', 'success', night)).toBe(10)
  })
})

describe('award with the ledger', () => {
  const pin = () => saveGameConfig({ sunMax: 1, lonelyDays: 100_000 })

  it('one tree, three interactions: 10 + 2 + 1, then nothing; a new tree is +10 again', () => {
    pin()
    expect(awardCheckin('T1', 'success', noon)).toBe(10)
    expect(award('whisper', 'T1', noon)).toBe(2)
    // 樹洞同一天只算一次
    expect(award('whisper', 'T1', noon)).toBe(0)
    // 第 3 個互動：回報固定 +15，但佔第 3 格
    expect(award('report', 'T1', noon)).toBe(15)
    expect(awardCheckin('T1', 'farView', noon)).toBe(0) // 第 4 個互動：不發
    expect(balance()).toBe(27)
    expect(awardCheckin('T2', 'success', noon)).toBe(10)
    expect(balance()).toBe(37)
  })

  it('check-in, report, whisper: the whisper is the 3rd interaction (+1)', () => {
    pin()
    awardCheckin('T1', 'success', noon)
    award('report', 'T1', noon)
    expect(award('whisper', 'T1', noon)).toBe(1)
  })

  it('a report is +15 and once per tree per day', () => {
    pin()
    expect(award('report', 'T1', noon)).toBe(15)
    expect(award('report', 'T1', noon)).toBe(0)
    expect(award('report', 'T2', noon)).toBe(15)
    expect(baseLedger()[0].reason).toBe('樹況回報')
  })

  it('daytime multiplier is in the ledger reason', () => {
    saveGameConfig({ lonelyDays: 100_000 })
    const d = awardCheckin('T1', 'success', morning)
    expect(d).toBe(Math.round(10 * daylightFactor(morning)))
    expect(d).toBeGreaterThan(10)
    expect(baseLedger()[0].reason).toMatch(/^打卡成功・日照 ×1\.\d$/)
  })

  it('lonely tree: x3 and the reason says so (mock)', () => {
    // T3：模擬 57 天沒人拜訪 → ×3；夜間沒有日照
    expect(awardCheckin('T3', 'success', night)).toBe(30)
    expect(baseLedger()[0].reason).toBe('打卡成功・寂寞樹 ×3（模擬）')
  })

  it('protected tree (passed explicitly): base 20 with the reason', () => {
    saveGameConfig({ lonelyDays: 100_000 })
    expect(award('checkin', 'P1', night, { protectedTree: true })).toBe(20)
    expect(baseLedger()[0].reason).toBe('打卡成功・受保護樹木 基礎 20')
  })

  it('from the 11th distinct tree of the day the check-in points are halved', () => {
    pin()
    for (let i = 1; i <= 10; i++) expect(awardCheckin(`TREE${i}`, 'success', noon)).toBe(10)
    expect(awardCheckin('TREE11', 'success', noon)).toBe(5)
    expect(baseLedger().at(-1)!.reason).toBe('打卡成功・今天第 11 棵起減半')
    expect(awardCheckin('TREE12', 'success', noon)).toBe(5)
    // 隔天重新算
    expect(awardCheckin('TREE13', 'success', new Date(noon.getTime() + DAY))).toBe(10)
  })

  it('the event name is appended to the reason', () => {
    pin()
    saveGameConfig({ events: [{ id: 'e', name: '植樹節', start: '2026-10-19', end: '2026-10-19', multiplier: 2 }] })
    expect(awardCheckin('T1', 'success', noon)).toBe(20)
    expect(baseLedger()[0].reason).toBe('打卡成功・植樹節')
  })

  it('watering a wish is +3 once per wish per day', () => {
    expect(gameConfig().points.water).toBe(3)
    expect(award('water', 'w1', noon)).toBe(3)
    expect(award('water', 'w1', noon)).toBe(0)
    expect(award('water', 'w2', noon)).toBe(3)
  })
})
