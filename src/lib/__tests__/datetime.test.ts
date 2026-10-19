import { describe, expect, it } from 'vitest'
import { formatDay, formatDayTime } from '../datetime'

const at = (y: number, m: number, d: number, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm).getTime()

describe('formatDay / formatDayTime', () => {
  const now = at(2026, 10, 20, 12)
  it('omits the year for this year', () => {
    expect(formatDay(at(2026, 10, 19), now)).toBe('10月19日')
    expect(formatDayTime(at(2026, 10, 19, 23, 1), now)).toBe('10月19日 23:01')
    expect(formatDayTime(at(2026, 1, 2, 7, 5), now)).toBe('1月2日 07:05')
  })
  it('adds the year for other years', () => {
    expect(formatDay(at(2025, 12, 31), now)).toBe('2025年12月31日')
  })
})
