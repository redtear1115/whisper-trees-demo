import { beforeEach, describe, expect, it } from 'vitest'
import { getState, recordCheckin, resetAll, setExt } from '../../../store'
import { award, awardCheckin, balance, daylightFactor, earned, isDaytime, spend } from '../ledger'
import { saveGameConfig, activeEvent, gameConfig, DEFAULT_SHOP } from '../config'
import { buy, equip, inventory } from '../inventory'
import { stageOf, STAGES } from '../character'
import { ANCIENT_HAT } from '../drops'
import { badges } from '../badges'

// 台北 2026-10-19 中午與半夜
const noon = new Date('2026-10-19T12:00:00+08:00')
const night = new Date('2026-10-19T23:00:00+08:00')

beforeEach(() => resetAll())

describe('award', () => {
  it('daytime check-in gets the sun multiplier, once per tree per day', () => {
    expect(isDaytime(noon)).toBe(true)
    const f = daylightFactor(noon)
    expect(f).toBeGreaterThan(1.45)
    expect(f).toBeLessThanOrEqual(1.5)
    expect(awardCheckin('T1', 'success', noon)).toBe(Math.round(10 * f))
    expect(awardCheckin('T1', 'success', noon)).toBe(0)
    expect(awardCheckin('T2', 'farView', noon)).toBe(Math.round(5 * f))
  })
  it('night check-in has no sun bonus', () => {
    expect(isDaytime(night)).toBe(false)
    expect(awardCheckin('T1', 'success', night)).toBe(10)
  })
  it('GM multiplier and events apply', () => {
    saveGameConfig({ multiplier: 1.5, events: [{ id: 'e', name: '雙倍', start: '2026-10-19', end: '2026-10-19', multiplier: 2 }] })
    expect(activeEvent(gameConfig(), '2026-10-19')?.name).toBe('雙倍')
    // 樹洞是同一棵樹的第 2 個互動：+2，乘全域 1.5 與活動 2、日照、不是寂寞樹
    expect(award('whisper', 'T1', noon)).toBe(Math.round(2 * 1.5 * 2 * daylightFactor(noon)))
    // 澆水是固定點數
    expect(award('water', 'w1', noon)).toBe(Math.round(3 * 1.5 * 2))
  })
  it('zero points means nothing is recorded', () => {
    saveGameConfig({ points: { ...gameConfig().points, water: 0 } })
    expect(award('water', 'w1', noon)).toBe(0)
    expect(balance()).toBe(0)
  })
})

describe('shop', () => {
  it('spending lowers balance but not growth', () => {
    // 關掉日照與寂寞樹倍率，數字才固定
    saveGameConfig({ sunMax: 1, lonelyDays: 100_000 })
    award('wish', 'a', noon)
    award('wish', 'b', noon)
    for (let i = 0; i < 6; i++) award('checkin', `t${i}`, noon)
    expect(balance()).toBe(70)
    const hat = DEFAULT_SHOP.find((i) => i.id === 'hat-acorn')!
    expect(buy(hat)).toBe('ok')
    expect(buy(hat)).toBe('owned')
    expect(balance()).toBe(40)
    expect(earned()).toBe(70)
    expect(inventory().equipped.outfit).toBe('hat-acorn')
    expect(spend(1000, 'x')).toBe(false)
    expect(buy(DEFAULT_SHOP.find((i) => i.id === 'cape-moss')!)).toBe('poor')
  })
  it('sells only virtual cosmetics: no civic items, three outfits and two frames', () => {
    expect(DEFAULT_SHOP.map((i) => i.id)).toEqual(['hat-acorn', 'crown-feather', 'cape-moss', 'frame-spring', 'frame-autumn'])
    expect(DEFAULT_SHOP.filter((i) => i.kind === 'outfit').map((i) => i.name)).toEqual(['橡實帽', '花冠羽毛', '苔蘚斗篷'])
  })
  it('legacy outfit ids in the stored inventory resolve to the renamed ones; the rare hat is untouched', () => {
    setExt('inventory', {
      owned: ['hat-straw', 'scarf-leaf', 'lantern', 'frame-spring', ANCIENT_HAT],
      equipped: { outfit: 'scarf-leaf', frame: 'frame-spring' },
      civic: { 'fund-10': 2 },
    })
    const inv = inventory()
    expect(inv.owned).toEqual(['hat-acorn', 'crown-feather', 'cape-moss', 'frame-spring', ANCIENT_HAT])
    expect(inv.equipped).toEqual({ outfit: 'crown-feather', frame: 'frame-spring' })
    expect(inv.civic).toEqual({ 'fund-10': 2 }) // old data is kept, just never written again
    expect(inventory()).toBe(inv)
    expect(buy(DEFAULT_SHOP[0])).toBe('owned')
    equip('outfit', ANCIENT_HAT)
    expect(inventory().equipped.outfit).toBe(ANCIENT_HAT)
    equip('outfit', 'cape-moss')
    expect(inventory().equipped.outfit).toBe('cape-moss')
    expect(inventory().owned.filter((x) => x === 'hat-acorn')).toHaveLength(1)
  })
  it('a GM-saved shop with old items is renamed in place and loses the civic ones', () => {
    setExt('gm', {
      shop: [
        { id: 'hat-straw', name: '草帽', kind: 'outfit', price: 45, active: false, art: 'item-hat-straw', brief: '' },
        { id: 'fund-10', name: '捐', kind: 'civic', price: 100, active: true, art: 'item-fund', brief: '' },
        { id: 'frame-spring', name: '春櫻相框', kind: 'frame', price: 40, active: true, art: 'item-frame-spring', brief: '' },
      ],
    })
    const shop = gameConfig().shop
    expect(shop.map((i) => i.id)).toEqual(['hat-acorn', 'frame-spring'])
    expect(shop[0]).toMatchObject({ name: '橡實帽', art: 'item-hat-acorn', price: 45, active: false })
  })
})

describe('character', () => {
  it('has three 樹精 stages that grow by earned points (0 / 100 / 300)', () => {
    expect(STAGES.map((s) => [s.name, s.min])).toEqual([['初心樹精', 0], ['茁壯樹精', 100], ['智慧老樹精', 300]])
    expect(stageOf(0).stage.name).toBe('初心樹精')
    expect(stageOf(99).stage.name).toBe('初心樹精')
    expect(stageOf(99).next?.name).toBe('茁壯樹精')
    expect(stageOf(100).stage.name).toBe('茁壯樹精')
    expect(stageOf(299).next?.name).toBe('智慧老樹精')
    expect(stageOf(300).stage.name).toBe('智慧老樹精')
    expect(stageOf(9999).next).toBeUndefined()
  })
})

describe('badges', () => {
  it('derive from records', () => {
    recordCheckin('T1', 'farView', { species: '茄苳', night: true })
    const b = Object.fromEntries(badges(getState()).map((x) => [x.id, x.earned]))
    expect(b.first).toBe(true)
    expect(b['far-view']).toBe(true)
    expect(b.night).toBe(true)
    expect(b['species-3']).toBe(false)
  })
})
