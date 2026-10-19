import { beforeEach, describe, expect, it } from 'vitest'
import { growthCopy } from '../character'
import { badges, badgeSummary } from '../badges'
import { getState, resetAll } from '../../../store'
import { setSession } from '../../../store/session'
import { award } from '../ledger'

describe('growthCopy', () => {
  it('never frames growth as what is missing', () => {
    for (const n of [0, 12, 30, 99, 250, 499, 500, 900]) {
      const c = growthCopy(n)
      expect(`${c.line}${c.note}`).not.toMatch(/再\s*\d+\s*光點|還差|還需要|不足/)
    }
  })
  it('a brand-new seed is invited, not scolded', () => {
    const c = growthCopy(0)
    expect(c.headline).toBe('小芽・種子')
    expect(c.line).toContain('第一道光')
    expect(c.percent).toBe(0)
  })
  it('mid-way names where it is growing to, with a percent for the bar', () => {
    const c = growthCopy(15)
    expect(c.headline).toBe('小芽・種子')
    expect(c.line).toContain('「發芽」')
    expect(c.percent).toBe(50)
    expect(c.valuetext).toContain('發芽')
  })
  it('top stage is complete at 100', () => {
    const c = growthCopy(500)
    expect(c.percent).toBe(100)
    expect(c.line).toContain('大樹')
  })
})

describe('badgeSummary', () => {
  beforeEach(() => {
    resetAll()
    setSession({ userReady: true })
  })
  it('explains a single earned badge so a new user knows why', () => {
    award('checkin', 'T1', new Date('2026-10-19T12:00:00+08:00'))
    expect(badgeSummary(badges(getState()))).toBe('第一道光：你收集了第一個光點')
  })
  it('says what to do when nothing is earned yet', () => {
    expect(badgeSummary(badges(getState()))).toContain('不用急')
  })
  it('every badge has an earned note', () => {
    for (const b of badges(getState())) expect(b.note.length).toBeGreaterThan(0)
  })
})
