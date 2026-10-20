import { beforeEach, describe, expect, it } from 'vitest'
import { growthCopy, spendNoteKind, stagePath } from '../character'
import { badges, badgeSummary } from '../badges'
import { getState, resetAll } from '../../../store'
import { setSession } from '../../../store/session'
import { award } from '../ledger'

describe('growthCopy', () => {
  it('never frames growth as what is missing', () => {
    for (const n of [0, 12, 30, 99, 100, 250, 299, 300, 900]) {
      const c = growthCopy(n, 'past')
      expect(`${c.line}${c.note}`).not.toMatch(/再\s*\d+\s*光點|還差|還需要|不足/)
    }
  })
  it('a brand-new 初心樹精 is invited, not scolded', () => {
    const c = growthCopy(0)
    expect(c.headline).toBe('小芽・初心樹精')
    expect(c.line).toContain('第一道光')
    expect(c.percent).toBe(0)
  })
  it('mid-way names where it is growing to, with a percent for the bar', () => {
    const c = growthCopy(50)
    expect(c.headline).toBe('小芽・初心樹精')
    expect(c.line).toContain('「茁壯樹精」')
    expect(c.percent).toBe(50)
    expect(c.valuetext).toContain('茁壯樹精')
    expect(growthCopy(100).headline).toBe('小芽・茁壯樹精')
    expect(growthCopy(250).line).toContain('「智慧老樹精」')
  })
  it('the spend reassurance is past tense only after something was spent; before that it says 之後', () => {
    for (const n of [0, 50, 99, 250]) {
      expect(growthCopy(n).note).toBe('')
      expect(growthCopy(n, 'past').note).toBe('光點花掉了，小芽也不會變小。')
      expect(growthCopy(n, 'future').note).toBe('之後用光點換東西，小芽也不會變小。')
    }
    expect(spendNoteKind({ balance: 0, spent: false })).toBeNull()
    expect(spendNoteKind({ balance: 30, spent: false })).toBe('future')
    expect(spendNoteKind({ balance: 0, spent: true })).toBe('past')
    expect(spendNoteKind({ balance: 30, spent: true })).toBe('past')
  })
  it('stagePath marks reached stages and the current one', () => {
    expect(stagePath(0).map((p) => [p.stage.name, p.reached, p.current])).toEqual([
      ['初心樹精', true, true],
      ['茁壯樹精', false, false],
      ['智慧老樹精', false, false],
    ])
    expect(stagePath(150).filter((p) => p.reached).length).toBe(2)
    expect(stagePath(150).find((p) => p.current)?.stage.name).toBe('茁壯樹精')
    expect(stagePath(300).every((p) => p.reached)).toBe(true)
  })
  it('top stage is complete at 100', () => {
    const c = growthCopy(300)
    expect(c.headline).toBe('小芽・智慧老樹精')
    expect(c.percent).toBe(100)
    expect(c.line).toContain('智慧老樹精')
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
