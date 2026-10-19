import { describe, expect, it } from 'vitest'
import { distanceMeters, offsetNorth, type LngLat } from '../../../lib/geo'
import {
  FOG_RADIUS_M,
  MIN_CLEAR_PX,
  circleRing,
  clearPixelRadius,
  clearedBounds,
  clearedCenters,
  exploredTreeIds,
  formatArea,
  fogStat,
  unionAreaKm2,
} from '../fog'

const A: LngLat = [121.5287, 25.0335]
const east = ([lon, lat]: LngLat, m: number): LngLat => [lon + m / (111_320 * Math.cos((lat * Math.PI) / 180)), lat]
const CIRCLE_KM2 = (Math.PI * FOG_RADIUS_M ** 2) / 1e6

describe('exploredTreeIds', () => {
  it('counts success and farView once per tree', () => {
    const ids = exploredTreeIds([
      { treeId: 'DA0030211045', result: 'success' },
      { treeId: 'DA0030211045', result: 'success' },
      { treeId: 'SL0560111023', result: 'farView' },
    ])
    expect(ids).toEqual(['DA0030211045', 'SL0560111023'])
  })

  it('compares TreeID as a whole string, suffix included', () => {
    const ids = exploredTreeIds([
      { treeId: 'DA0030211045', result: 'success' },
      { treeId: 'DA0030211045-001', result: 'success' },
    ])
    expect(ids).toHaveLength(2)
  })

  it('ignores other results', () => {
    expect(exploredTreeIds([{ treeId: 'X', result: 'tooFar' as never }])).toEqual([])
  })

  it('is empty without check-ins', () => {
    expect(exploredTreeIds([])).toEqual([])
  })
})

describe('clearedCenters', () => {
  it('skips trees with no coordinates', () => {
    const coords = new Map<string, LngLat>([['a', A]])
    expect(clearedCenters(['a', 'ghost'], coords)).toEqual([A])
  })
})

describe('circle geometry', () => {
  it('ring points are 50 m from the tree', () => {
    for (const p of circleRing(A, FOG_RADIUS_M)) expect(distanceMeters(A, p)).toBeCloseTo(FOG_RADIUS_M, 0)
  })

  it('bounds wrap the circle', () => {
    const [w, s, e, n] = clearedBounds([A])!
    expect(distanceMeters([w, A[1]], A)).toBeCloseTo(FOG_RADIUS_M, 0)
    expect(distanceMeters([A[0], n], A)).toBeCloseTo(FOG_RADIUS_M, 0)
    expect(e).toBeGreaterThan(A[0])
    expect(s).toBeLessThan(A[1])
    expect(clearedBounds([])).toBeNull()
  })
})

describe('unionAreaKm2', () => {
  it('one circle is about pi r^2', () => {
    expect(Math.abs(unionAreaKm2([A]) / CIRCLE_KM2 - 1)).toBeLessThan(0.03)
  })

  it('identical circles are not double counted', () => {
    expect(unionAreaKm2([A, A, A])).toBeCloseTo(unionAreaKm2([A]), 8)
  })

  it('disjoint circles add up', () => {
    const b = offsetNorth(A, 500)
    expect(unionAreaKm2([A, b]) / unionAreaKm2([A])).toBeCloseTo(2, 1)
  })

  it('overlapping circles are less than the sum but more than one', () => {
    const one = unionAreaKm2([A])
    const two = unionAreaKm2([A, east(A, 50)])
    expect(two).toBeGreaterThan(one * 1.3)
    expect(two).toBeLessThan(one * 2 * 0.95)
    // 兩圓圓心距 r：聯集 = 2πr² - 2(πr²/3 - √3r²/4)，約 1.61 倍
    expect(two / one).toBeCloseTo(1.61, 1)
  })

  it('is zero for no trees and fast for many trees', () => {
    expect(unionAreaKm2([])).toBe(0)
    const many: LngLat[] = []
    for (let i = 0; i < 1500; i++) many.push([A[0] + (i % 40) * 0.0004, A[1] + Math.floor(i / 40) * 0.0004])
    const t = performance.now()
    const area = unionAreaKm2(many)
    expect(performance.now() - t).toBeLessThan(1000)
    expect(area).toBeLessThan(1500 * CIRCLE_KM2)
  })
})

describe('fogStat / format', () => {
  it('reports count and area', () => {
    expect(fogStat([A, east(A, 500)]).count).toBe(2)
    expect(fogStat([]).areaKm2).toBe(0)
  })
  it('formats tiny areas honestly', () => {
    expect(formatArea(0)).toBe('0')
    expect(formatArea(0.0079)).toBe('不到 0.01')
    expect(formatArea(0.1234)).toBe('0.12')
  })
  it('keeps a visible radius when zoomed out', () => {
    expect(clearPixelRadius(50, 70)).toBe(MIN_CLEAR_PX)
    expect(clearPixelRadius(50, 1)).toBe(50)
  })
})
