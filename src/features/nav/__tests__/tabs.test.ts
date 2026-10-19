import { describe, expect, it } from 'vitest'
import { TABS, activeTab, showNav } from '../tabs'

describe('bottom nav tabs', () => {
  it('has 5 tabs in the agreed order, home in the middle', () => {
    expect(TABS.map((t) => t.to)).toEqual(['/stamps', '/explore', '/', '/journal', '/me'])
    expect(TABS.map((t) => t.label)).toEqual(['集章冊', '探索', '首頁', '樹洞', '我的'])
  })

  it('marks the tab whose root page is open', () => {
    expect(activeTab('/')).toBe('home')
    expect(activeTab('/stamps')).toBe('stamps')
    expect(activeTab('/explore')).toBe('explore')
    expect(activeTab('/journal')).toBe('journal')
    expect(activeTab('/me')).toBe('me')
    expect(activeTab('/me/')).toBe('me')
  })

  it('"/" is not active on other pages', () => {
    expect(activeTab('/shop')).toBeNull()
  })

  it('sub pages and back-office pages have no nav', () => {
    for (const p of ['/shop', '/scan', '/tree/SL0560111023', '/wishes', '/gov', '/vendor', '/gm', '/developers', '/demo-control', '/codex', '/more']) {
      expect(showNav(p), p).toBe(false)
    }
    for (const t of TABS) expect(showNav(t.to)).toBe(true)
  })
})
