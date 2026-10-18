import { describe, expect, it } from 'vitest'
import { DEFAULT_WEIGHTS, scoreAll } from '../score'

const perKm = [132, 115, 88, 81, 75, 72, 68, 66, 63, 47, 45, 44]

describe('scoreAll', () => {
  const items = [
    { waterings: 50, treesPerKm: 44, feasibility: 'emptyPit' as const },
    { waterings: 0, treesPerKm: 132, feasibility: 'needsSurvey' as const },
  ]
  it('ranks need higher', () => {
    const [a, b] = scoreAll(items, DEFAULT_WEIGHTS, perKm)
    expect(a.total).toBeGreaterThan(b.total)
    expect(a.demand).toBe(1)
    expect(a.shade).toBe(1)
    expect(a.fairness).toBe(1)
    expect(b.shade).toBe(0)
    expect(b.fairness).toBe(0)
  })
  it('all-zero weights do not divide by zero', () => {
    const r = scoreAll(items, { demand: 0, shade: 0, feasibility: 0, fairness: 0 }, perKm)
    r.forEach((s) => expect(s.total).toBe(0))
  })
  it('no waterings at all does not divide by zero', () => {
    const r = scoreAll([{ ...items[0], waterings: 0 }], DEFAULT_WEIGHTS, perKm)
    expect(Number.isFinite(r[0].total)).toBe(true)
  })
  it('a single weight picks that component', () => {
    const r = scoreAll(items, { demand: 0, shade: 0, feasibility: 100, fairness: 0 }, perKm)
    expect(r[0].total).toBe(1)
    expect(r[1].total).toBeCloseTo(0.3)
  })
})
