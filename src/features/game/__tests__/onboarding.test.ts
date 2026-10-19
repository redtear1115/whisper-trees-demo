import { beforeEach, describe, expect, it } from 'vitest'
import { addWhisper, createWish, getState, resetAll, setExt } from '../../../store'
import { setSession } from '../../../store/session'
import { badges } from '../badges'
import { DEFAULT_SHOP } from '../config'
import { buy, equip, inventory, STARTER_GIFT } from '../inventory'
import { adjust, award, balance } from '../ledger'
import { firstLightEarned, grantStarterGift, newcomerDone, onboarding, patchOnboarding, tasks } from '../onboarding'

const noon = new Date('2026-10-19T12:00:00+08:00')
const hat = DEFAULT_SHOP.find((i) => i.id === 'hat-straw')!
const done = () => Object.fromEntries(tasks().map((t) => [t.id, t.done]))
const badge = (id: string) => badges(getState()).find((b) => b.id === id)!

beforeEach(() => {
  resetAll()
  setSession({ userReady: true })
})

describe('first light (A1)', () => {
  it('is true after award() and false after only a GM adjust()', () => {
    expect(firstLightEarned()).toBe(false)
    adjust(100, 'GM 補發')
    expect(balance()).toBe(100)
    expect(firstLightEarned()).toBe(false)
    expect(badge('first-light').earned).toBe(false)
    award('checkin', 'T1', noon)
    expect(firstLightEarned()).toBe(true)
    expect(badge('first-light').earned).toBe(true)
  })
  it('is not triggered by a spend entry', () => {
    setExt('ledger', [{ at: 1, delta: -5, reason: 'x' }])
    expect(firstLightEarned()).toBe(false)
  })
})

describe('starter gift', () => {
  it('needs A1 first', () => {
    expect(grantStarterGift()).toBe(false)
    expect(onboarding().giftAt).toBeUndefined()
  })
  it('is idempotent, keeps the balance and never writes ext.inventory or ext.ledger', () => {
    award('checkin', 'T1', noon)
    const ledgerBefore = getState().ext.ledger
    const bal = balance()
    expect(grantStarterGift()).toBe(true)
    const at = onboarding().giftAt
    expect(at).toBeGreaterThan(0)
    expect(grantStarterGift()).toBe(false)
    expect(onboarding().giftAt).toBe(at)
    expect(balance()).toBe(bal)
    expect(getState().ext.ledger).toBe(ledgerBefore)
    expect(getState().ext.inventory).toBeUndefined()
  })
  it('does nothing until the user doc is ready', () => {
    award('checkin', 'T1', noon)
    setSession({ userReady: false })
    expect(grantStarterGift()).toBe(false)
    expect(onboarding().giftAt).toBeUndefined()
    setSession({ userReady: true })
    expect(grantStarterGift()).toBe(true)
  })
  it('inventory() lists hat-straw exactly once and with a stable reference', () => {
    expect(inventory().owned).toEqual([])
    patchOnboarding({ giftAt: 1 })
    expect(inventory().owned).toEqual([STARTER_GIFT])
    expect(inventory()).toBe(inventory())
    equip('outfit', STARTER_GIFT)
    expect(inventory().owned.filter((x) => x === STARTER_GIFT)).toHaveLength(1)
    expect(inventory().equipped.outfit).toBe(STARTER_GIFT)
  })
  it('buy(hat-straw) returns owned once the gift is given, without charging', () => {
    award('checkin', 'T1', noon)
    const bal = balance()
    grantStarterGift()
    expect(buy(hat)).toBe('owned')
    expect(balance()).toBe(bal)
  })
})

describe('patchOnboarding', () => {
  it('keeps existing fields', () => {
    patchOnboarding({ tourDismissedAt: 5 })
    patchOnboarding({ homeScreenAt: 7 })
    expect(onboarding()).toEqual({ tourDismissedAt: 5, homeScreenAt: 7 })
    patchOnboarding({ tourStep: 2 })
    expect(onboarding()).toEqual({ tourDismissedAt: 5, homeScreenAt: 7, tourStep: 2 })
  })
})

describe('home-screen badge (A2)', () => {
  it('follows homeScreenAt', () => {
    expect(badge('home-screen').earned).toBe(false)
    patchOnboarding({ homeScreenAt: 1 })
    expect(badge('home-screen').earned).toBe(true)
  })
})

describe('task derivation', () => {
  it('starts all undone', () => {
    expect(done()).toEqual({ shop: false, codex: false, whisper: false, wish: false })
    expect(newcomerDone()).toBe(false)
  })
  it('shop: equipped outfit or frame, or a civic purchase', () => {
    setExt('inventory', { owned: ['x'], equipped: {}, civic: {} })
    expect(done().shop).toBe(false)
    setExt('inventory', { owned: ['x'], equipped: { frame: 'x' }, civic: {} })
    expect(done().shop).toBe(true)
    setExt('inventory', { owned: [], equipped: {}, civic: { 'civic-tree': 1 } })
    expect(done().shop).toBe(true)
  })
  it('shop: just owning the gift does not count until it is worn', () => {
    patchOnboarding({ giftAt: 1 })
    expect(done().shop).toBe(false)
    equip('outfit', STARTER_GIFT)
    expect(done().shop).toBe(true)
  })
  it('codex needs both viewed flags', () => {
    patchOnboarding({ viewedCodexAt: 1 })
    expect(done().codex).toBe(false)
    patchOnboarding({ viewedBadgesAt: 2 })
    expect(done().codex).toBe(true)
  })
  it('whisper: only the user\'s own whispers count, not the mock seed', () => {
    expect(done().whisper).toBe(false)
    addWhisper('T1', '你好')
    expect(done().whisper).toBe(true)
  })
  it('wish: myWishIds not empty', () => {
    createWish({ pitId: 'p1', lngLat: [121, 25], road: 'x', district: '中正區', reasons: ['太曬'], feasibility: 'emptyPit' })
    expect(done().wish).toBe(true)
  })
})

describe('fresh user, no GM top-up', () => {
  it('award, gift, equip, whisper, wish, views leads to the newcomer badge', () => {
    award('checkin', 'T1', noon)
    expect(grantStarterGift()).toBe(true)
    equip('outfit', STARTER_GIFT)
    addWhisper('T1', '你好')
    expect(badge('newcomer').earned).toBe(false)
    createWish({ pitId: 'p1', lngLat: [121, 25], road: 'x', district: '中正區', reasons: ['太曬'], feasibility: 'emptyPit' })
    patchOnboarding({ viewedCodexAt: 1 })
    expect(badge('newcomer').earned).toBe(false)
    patchOnboarding({ viewedBadgesAt: 2 })
    expect(newcomerDone()).toBe(true)
    expect(badge('newcomer').earned).toBe(true)
    expect(getState().ext.ledgerOverlay).toBeUndefined()
  })
  it('there are 12 badges', () => {
    expect(badges(getState())).toHaveLength(12)
  })
})
