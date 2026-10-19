import { describe, expect, it } from 'vitest'
import { backTarget } from '../TreePage'

describe('backTarget', () => {
  it('returns to the tab the tree was opened from', () => {
    expect(backTarget('/me')).toEqual({ to: '/me', label: '我的' })
    expect(backTarget('/journal')).toEqual({ to: '/journal', label: '樹洞' })
  })
  it('falls back to the map', () => {
    expect(backTarget(undefined)).toEqual({ to: '/', label: '地圖' })
    expect(backTarget('/scan')).toEqual({ to: '/', label: '地圖' })
  })
})
