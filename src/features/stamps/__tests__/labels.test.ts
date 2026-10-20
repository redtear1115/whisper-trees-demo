import { describe, expect, it } from 'vitest'
import { overlaps, spreadLabels, type LabelBox } from '../labels'

const box = (id: string, x: number, y: number, extra: Partial<LabelBox> = {}): LabelBox => ({ id, x, y, w: 28, h: 16, ...extra })

describe('spreadLabels', () => {
  it('leaves labels that do not touch where they are', () => {
    const out = spreadLabels([box('a', 0, 0), box('b', 100, 0)])
    expect(out.map((b) => [b.x, b.y])).toEqual([[0, 0], [100, 0]])
  })

  it('pushes two stacked labels apart until they no longer overlap', () => {
    const out = spreadLabels([box('a', 0, 0), box('b', 4, 6)])
    expect(overlaps(out[0], out[1])).toBe(false)
  })

  it('separates a cluster of three', () => {
    const out = spreadLabels([box('a', 0, 0), box('b', 5, 3), box('c', -4, 5)])
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(overlaps(out[i], out[j])).toBe(false)
  })

  it('keeps each label centre inside its own district box', () => {
    const within = [-30, -20, 30, 20] as const
    const out = spreadLabels([box('a', 0, 0, { within }), box('b', 1, 1, { within })])
    for (const b of out) {
      expect(b.x).toBeGreaterThanOrEqual(-30)
      expect(b.x).toBeLessThanOrEqual(30)
      expect(b.y).toBeGreaterThanOrEqual(-20)
      expect(b.y).toBeLessThanOrEqual(20)
    }
  })

  it('does not mutate the input', () => {
    const input = [box('a', 0, 0), box('b', 1, 1)]
    spreadLabels(input)
    expect([input[0].y, input[1].y]).toEqual([0, 1])
  })
})
