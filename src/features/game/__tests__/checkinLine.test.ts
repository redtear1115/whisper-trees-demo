import { describe, expect, it } from 'vitest'
import { checkinPointsLine, reportPointsLine } from '../checkinLine'

describe('checkinPointsLine', () => {
  it('is hidden unless the check-in just happened', () => {
    expect(checkinPointsLine({ glow: undefined, kind: 'success', protectedTree: false })).toBeNull()
  })
  it('says how many lights, one line, no multipliers', () => {
    expect(checkinPointsLine({ glow: 29, kind: 'success', protectedTree: false })).toBe('收進 29 道光點')
  })
  it('adds one reason tag', () => {
    expect(checkinPointsLine({ glow: 41, kind: 'success', protectedTree: true })).toBe('收進 41 道光點・受保護樹木')
    expect(checkinPointsLine({ glow: 6, kind: 'farView', protectedTree: false })).toBe('收進 6 道光點・遠觀')
    expect(checkinPointsLine({ glow: 6, kind: 'farView', protectedTree: true })).toBe('收進 6 道光點・遠觀')
  })
  it('says so when today is already collected', () => {
    expect(checkinPointsLine({ glow: 0, kind: 'success', protectedTree: false })).toBe('今天在這棵樹旁的光點，已經收過了。')
  })
})

describe('reportPointsLine', () => {
  it('matches the check-in wording', () => {
    expect(reportPointsLine(15)).toBe('收進 15 道光點。')
    expect(reportPointsLine(0)).toBe('')
  })
})
