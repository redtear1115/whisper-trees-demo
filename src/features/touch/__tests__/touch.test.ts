import { describe, expect, it } from 'vitest'
import { BREATH, breathPhase, meditateLeft, TOUCHES } from '../touch'

describe('TOUCHES', () => {
  it('has 呼吸, 冥想, 擁抱 in that order', () => {
    expect(TOUCHES.map((t) => t.name)).toEqual(['呼吸', '冥想', '擁抱'])
  })
})

describe('breathPhase', () => {
  it('breathes in 4 s then out 4 s, three rounds', () => {
    expect(breathPhase(0)).toEqual({ round: 1, phase: 'in', done: false })
    expect(breathPhase(3999)).toEqual({ round: 1, phase: 'in', done: false })
    expect(breathPhase(4000)).toEqual({ round: 1, phase: 'out', done: false })
    expect(breathPhase(8000)).toEqual({ round: 2, phase: 'in', done: false })
    expect(breathPhase(23_999)).toEqual({ round: 3, phase: 'out', done: false })
  })
  it('is done after 3 rounds, and odd input does not break it', () => {
    expect(breathPhase(BREATH.rounds * 8000).done).toBe(true)
    expect(breathPhase(Number.NaN).done).toBe(true)
    expect(breathPhase(-50)).toEqual({ round: 1, phase: 'in', done: false })
  })
})

describe('meditateLeft', () => {
  it('counts down 60 s, rounded up, never below 0', () => {
    expect(meditateLeft(0)).toBe(60)
    expect(meditateLeft(500)).toBe(60)
    expect(meditateLeft(59_001)).toBe(1)
    expect(meditateLeft(60_000)).toBe(0)
    expect(meditateLeft(90_000)).toBe(0)
  })
})
