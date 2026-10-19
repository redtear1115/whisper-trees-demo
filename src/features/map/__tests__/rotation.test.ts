import { describe, expect, it } from 'vitest'
import { dragBearing, normalizeBearing, pointerAngle } from '../rotation'

describe('pointerAngle', () => {
  it('is 0 at the top and clockwise-positive', () => {
    expect(pointerAngle(0, 0, 0, -10)).toBeCloseTo(0)
    expect(pointerAngle(0, 0, 10, 0)).toBeCloseTo(90)
    expect(pointerAngle(0, 0, 0, 10)).toBeCloseTo(180)
    expect(pointerAngle(0, 0, -10, 0)).toBeCloseTo(-90)
  })
})

describe('dragBearing', () => {
  it('dragging the ring clockwise turns the map the other way', () => {
    expect(dragBearing(0, 0, 30)).toBe(330)
    expect(dragBearing(90, 10, -20)).toBe(120)
  })
  it('stays within 0-360', () => {
    expect(normalizeBearing(-15)).toBe(345)
    expect(normalizeBearing(375)).toBe(15)
  })
})
