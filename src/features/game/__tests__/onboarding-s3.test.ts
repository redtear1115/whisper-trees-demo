import { describe, expect, it } from 'vitest'
import { shouldCelebrateNewcomer, showTasksChip, tasks } from '../onboarding'

describe('showTasksChip', () => {
  const base = { ready: true, firstLight: true, tourOpen: false, allDone: false }
  it('shows after first light, tour closed, tasks unfinished', () => expect(showTasksChip(base)).toBe(true))
  it.each([
    ['not ready', { ready: false }],
    ['no first light', { firstLight: false }],
    ['tour open', { tourOpen: true }],
    ['all done', { allDone: true }],
  ])('hidden when %s', (_n, patch) => expect(showTasksChip({ ...base, ...patch })).toBe(false))
})

describe('shouldCelebrateNewcomer', () => {
  it('only when ready, done and not yet celebrated', () => {
    expect(shouldCelebrateNewcomer({ ready: true, done: true })).toBe(true)
    expect(shouldCelebrateNewcomer({ ready: true, done: true, celebratedAt: 5 })).toBe(false)
    expect(shouldCelebrateNewcomer({ ready: false, done: true })).toBe(false)
    expect(shouldCelebrateNewcomer({ ready: true, done: false })).toBe(false)
  })
})

describe('task links', () => {
  it('whisper and wish explain where to go on the map', () => {
    const t = tasks()
    expect(t.find((x) => x.id === 'whisper')?.hint).toContain('點一棵樹')
    expect(t.find((x) => x.id === 'wish')?.hint).toContain('空樹穴')
  })
})
