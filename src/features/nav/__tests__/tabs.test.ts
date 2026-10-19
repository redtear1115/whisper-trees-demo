import { describe, expect, it } from 'vitest'
import { NAV_SLOTS, SCAN_CLOSE_TO, TABS, activeTab, centerAction, scanState, showNav } from '../tabs'
import { LEGACY_REDIRECTS, stampsTabFromSearch } from '../redirects'

describe('bottom nav tabs', () => {
  it('has 4 tabs plus the scan button in the middle: 首頁・集章冊・［掃樹牌］・樹洞・我的', () => {
    expect(NAV_SLOTS).toEqual(['home', 'stamps', 'scan', 'journal', 'me'])
    expect(TABS.map((t) => t.to)).toEqual(['/', '/stamps', '/journal', '/me'])
    expect(TABS.map((t) => t.label)).toEqual(['首頁', '集章冊', '樹洞', '我的'])
    // 每個分頁都在導覽的 5 格裡，順序和 NAV_SLOTS 一致
    expect(NAV_SLOTS.filter((s) => s !== 'scan')).toEqual(TABS.map((t) => t.id))
  })

  it('marks the tab whose root page is open; 首頁 is an ordinary tab', () => {
    expect(activeTab('/')).toBe('home')
    expect(activeTab('/stamps')).toBe('stamps')
    expect(activeTab('/journal')).toBe('journal')
    expect(activeTab('/me')).toBe('me')
    expect(activeTab('/me/')).toBe('me')
  })

  it('"/" is not active on other pages', () => {
    expect(activeTab('/shop')).toBeNull()
  })

  it('sub pages and back-office pages have no nav', () => {
    for (const p of ['/shop', '/scan', '/tree/SL0560111023', '/wishes', '/gov', '/vendor', '/gm', '/developers', '/demo-control']) {
      expect(showNav(p), p).toBe(false)
    }
    for (const t of TABS) expect(showNav(t.to)).toBe(true)
  })
})

describe('centerAction', () => {
  it('is always 掃樹牌 → /scan, on every tab', () => {
    expect(centerAction()).toEqual({ kind: 'scan', to: '/scan', label: '掃樹牌' })
  })

  it('carries the focused tree only from the home map', () => {
    expect(scanState('home', 'DA0030211045')).toEqual({ hintTreeId: 'DA0030211045' })
    expect(scanState('home', null)).toBeUndefined()
    for (const t of ['stamps', 'journal', 'me'] as const) expect(scanState(t, 'DA0030211045')).toBeUndefined()
    expect(scanState(null, 'DA0030211045')).toBeUndefined()
  })

  it('closing the scanner always lands on the home map', () => {
    expect(SCAN_CLOSE_TO).toBe('/')
  })
})

describe('legacy redirects', () => {
  it('/explore and /codex go to the explore part of 集章冊', () => {
    expect(LEGACY_REDIRECTS['/explore']).toBe('/stamps?tab=explore')
    expect(LEGACY_REDIRECTS['/codex']).toBe('/stamps?tab=explore')
    expect(LEGACY_REDIRECTS['/more']).toBe('/me')
  })

  it('/stamps reads ?tab= : explore selects 探索, anything else is 集章', () => {
    const target = LEGACY_REDIRECTS['/explore']
    expect(stampsTabFromSearch(target.slice(target.indexOf('?')))).toBe('explore')
    expect(stampsTabFromSearch('')).toBe('stamps')
    expect(stampsTabFromSearch('?tab=stamps')).toBe('stamps')
    expect(stampsTabFromSearch('?tab=nope')).toBe('stamps')
  })

  it('redirect targets are real routes with a nav', () => {
    for (const to of Object.values(LEGACY_REDIRECTS)) expect(showNav(to.split('?')[0])).toBe(true)
  })
})
