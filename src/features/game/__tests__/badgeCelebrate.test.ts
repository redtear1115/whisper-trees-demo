import { beforeEach, describe, expect, it } from 'vitest'
import { createWish, getState, resetAll } from '../../../store'
import { setSession } from '../../../store/session'
import { badges, badgesToCelebrate } from '../badges'

beforeEach(() => {
  resetAll()
  setSession({ userReady: true })
})

describe('wisher badge', () => {
  it('lights up right after a wish', () => {
    expect(badges(getState()).find((b) => b.id === 'wisher')!.earned).toBe(false)
    createWish({ pitId: null, lngLat: [121.52, 25.03], road: '信義路', district: '大安區', reasons: ['太曬'], feasibility: 'needsSurvey' })
    expect(badges(getState()).find((b) => b.id === 'wisher')!.earned).toBe(true)
  })
})

describe('badgesToCelebrate', () => {
  it('seeds silently for users who never had the field', () => {
    expect(badgesToCelebrate(['first', 'wisher'], undefined)).toEqual({ show: [], record: ['first', 'wisher'] })
    expect(badgesToCelebrate([], undefined)).toEqual({ show: [], record: [] })
  })
  it('shows only new badges, once', () => {
    const a = badgesToCelebrate(['first', 'wisher'], ['first'])
    expect(a).toEqual({ show: ['wisher'], record: ['first', 'wisher'] })
    expect(badgesToCelebrate(['first', 'wisher'], a.record).show).toEqual([])
  })
  it('skips the three badges that have their own celebration', () => {
    expect(badgesToCelebrate(['first-light', 'newcomer', 'home-screen', 'reporter'], []).show).toEqual(['reporter'])
  })
})
