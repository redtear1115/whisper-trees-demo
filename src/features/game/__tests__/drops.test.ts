import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { balance, ledger } from '../ledger'
import { gameConfig, saveGameConfig, RARE_ITEMS, allItems, DEFAULT_CONFIG } from '../config'
import { equip, inventory } from '../inventory'
import { setProtectedTreesForTest } from '../protectedTrees'
import { ANCIENT_HAT, checkinDrops, grantAncientHat, inSeason, INSECTS, insectById, rollInsect } from '../drops'
import { newestRows } from '../../account/ledgerRows'

// 台北 2026-10-19 中午；2026-07-15 是蟬的季節
const oct = new Date('2026-10-19T12:00:00+08:00')
const jul = new Date('2026-07-15T12:00:00+08:00')

beforeEach(() => {
  resetAll()
  setProtectedTreesForTest(['OLD1', 'OLD2'])
})

describe('稀有配件：古木紋理頭飾', () => {
  it('第一次在受保護樹木打卡成功就給，放進造型、不能在商店買', () => {
    expect(grantAncientHat('OLD1', 'success')).toBe(true)
    expect(inventory().owned).toContain(ANCIENT_HAT)
    expect(RARE_ITEMS.map((i) => i.id)).toContain(ANCIENT_HAT)
    expect(gameConfig().shop.some((i) => i.id === ANCIENT_HAT)).toBe(false)
    expect(allItems(gameConfig()).some((i) => i.id === ANCIENT_HAT)).toBe(true)
    equip('outfit', ANCIENT_HAT)
    expect(inventory().equipped.outfit).toBe(ANCIENT_HAT)
  })
  it('每個使用者只有一次，換另一棵受保護樹木也不再給', () => {
    expect(grantAncientHat('OLD1', 'success')).toBe(true)
    expect(grantAncientHat('OLD1', 'success')).toBe(false)
    expect(grantAncientHat('OLD2', 'success')).toBe(false)
    expect(inventory().owned.filter((i) => i === ANCIENT_HAT)).toHaveLength(1)
  })
  it('遠觀不給，之後第一次成功打卡才給', () => {
    expect(grantAncientHat('OLD1', 'farView')).toBe(false)
    expect(inventory().owned).not.toContain(ANCIENT_HAT)
    expect(grantAncientHat('OLD1', 'success')).toBe(true)
  })
  it('不是受保護樹木不給，也不會把「第一次」用掉', () => {
    expect(grantAncientHat('PLAIN', 'success')).toBe(false)
    expect(grantAncientHat('OLD2', 'success')).toBe(true)
  })
  it('名冊還沒讀到時當一般樹，不給', () => {
    setProtectedTreesForTest(null)
    expect(grantAncientHat('OLD1', 'success')).toBe(false)
  })
  it('checkinDrops 回報 hat，第二次沒有', () => {
    expect(checkinDrops('OLD1', 'success', true, oct).hat).toBe(true)
    expect(checkinDrops('OLD2', 'success', true, oct).hat).toBeUndefined()
  })
})

describe('樹上住戶：昆蟲彩蛋（模擬）', () => {
  it('同樣的樹、日期、使用者永遠同樣的結果', () => {
    for (let i = 0; i < 50; i++) {
      const a = rollInsect(`T${i}`, '2026-10-19', 'u1', 0.5)
      const b = rollInsect(`T${i}`, '2026-10-19', 'u1', 0.5)
      expect(a?.id).toBe(b?.id)
    }
  })
  it('換使用者或換一天會得到不同的抽籤', () => {
    const ids = (uid: string, day: string) =>
      Array.from({ length: 200 }, (_, i) => rollInsect(`T${i}`, day, uid, 0.5)?.id ?? '-').join()
    expect(ids('u1', '2026-10-19')).not.toBe(ids('u2', '2026-10-19'))
    expect(ids('u1', '2026-10-19')).not.toBe(ids('u1', '2026-10-20'))
  })
  it('機率 0 一定沒有、1 一定有', () => {
    for (let i = 0; i < 200; i++) {
      expect(rollInsect(`T${i}`, '2026-10-19', 'u', 0)).toBeNull()
      expect(rollInsect(`T${i}`, '2026-10-19', 'u', 1)).not.toBeNull()
    }
  })
  it('機率大致符合（15%）', () => {
    const hits = Array.from({ length: 4000 }, (_, i) => rollInsect(`T${i}`, '2026-10-19', 'u', DEFAULT_CONFIG.insectChance)).filter(Boolean).length
    expect(hits / 4000).toBeGreaterThan(0.12)
    expect(hits / 4000).toBeLessThan(0.18)
  })
  it('蟬只在 5～9 月出現', () => {
    const cicada = insectById('cicada')!
    expect(inSeason(cicada, '2026-04-30')).toBe(false)
    expect(inSeason(cicada, '2026-05-01')).toBe(true)
    expect(inSeason(cicada, '2026-09-30')).toBe(true)
    expect(inSeason(cicada, '2026-10-01')).toBe(false)
    const seen = (day: string) => new Set(Array.from({ length: 300 }, (_, i) => rollInsect(`T${i}`, day, 'u', 1)?.id))
    expect(seen('2026-10-19').has('cicada')).toBe(false)
    expect(seen('2026-07-15').has('cicada')).toBe(true)
    expect(seen('2026-10-19').size).toBe(INSECTS.length - 1)
  })

  it('出現時：額外光點是獨立一筆紀錄、寫進圖鑑資料、同一天不重領', () => {
    saveGameConfig({ insectChance: 1 })
    const d = checkinDrops('T1', 'success', true, oct)
    expect(d.insect?.bonus).toBe(3)
    expect(balance()).toBe(3)
    const e = ledger()[0]
    expect(e.reason).toMatch(/^樹上住戶：.+（模擬）$/)
    expect(e.reason).toContain(d.insect!.name)
    expect(e.key).toBe('insect:T1:2026-10-19')
    expect(newestRows(ledger())[0].treeId).toBe('T1') // 光點紀錄可以連到那棵樹
    expect(inventory().insects?.[d.insect!.id]).toEqual({ treeId: 'T1', at: oct.getTime() })
    // 同一天重掃（firstToday 為 false）與重算（ledger key）都不會再來一次
    expect(checkinDrops('T1', 'success', false, oct).insect).toBeUndefined()
    expect(balance()).toBe(3)
  })
  it('機率 0、遠觀、不是今天第一次都不出現', () => {
    saveGameConfig({ insectChance: 0 })
    expect(checkinDrops('T1', 'success', true, oct).insect).toBeUndefined()
    saveGameConfig({ insectChance: 1 })
    expect(checkinDrops('T1', 'farView', true, oct).insect).toBeUndefined()
    expect(checkinDrops('T1', 'success', false, oct).insect).toBeUndefined()
    expect(balance()).toBe(0)
    expect(inventory().insects).toBeUndefined()
  })
  it('第一次遇見的樹與日期不會被後來的覆蓋', () => {
    saveGameConfig({ insectChance: 1 })
    // 只剩一種：用 10 月，從瓢蟲、獨角仙裡找兩次遇到同一種
    const first = checkinDrops('A', 'success', true, oct).insect!
    let again: typeof first | undefined
    for (let i = 0; i < 100 && !again; i++) {
      const r = checkinDrops(`B${i}`, 'success', true, oct).insect
      if (r?.id === first.id) again = r
    }
    expect(again).toBeDefined()
    expect(inventory().insects?.[first.id]?.treeId).toBe('A')
  })
  it('GM 調整：額外光點可改、0 就只進圖鑑，活動倍率會乘上去', () => {
    saveGameConfig({ insectChance: 1, insectBonus: 0 })
    const d = checkinDrops('T1', 'success', true, oct)
    expect(d.insect?.bonus).toBe(0)
    expect(balance()).toBe(0)
    expect(inventory().insects?.[d.insect!.id]).toBeDefined()
    saveGameConfig({ insectBonus: 4, events: [{ id: 'e', name: '雙倍', start: '2026-10-19', end: '2026-10-19', multiplier: 2 }] })
    expect(checkinDrops('T2', 'success', true, oct).insect?.bonus).toBe(8)
    expect(ledger()[0].reason).toContain('雙倍')
  })
  it('7 月可能抽到蟬', () => {
    saveGameConfig({ insectChance: 1 })
    const ids = new Set(Array.from({ length: 60 }, (_, i) => checkinDrops(`J${i}`, 'success', true, jul).insect?.id))
    expect(ids.has('cicada')).toBe(true)
  })
})
