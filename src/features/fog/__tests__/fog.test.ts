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
  fogView,
  FOG_CLUSTER_M,
  FOG_FIT_MAX_ZOOM,
  FOG_FIT_SPAN_M,
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

describe('fogView', () => {
  const inside = (b: [number, number, number, number], p: LngLat) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]

  it('nothing explored: no view (city)', () => {
    expect(fogView([])).toBeNull()
  })

  it('one tree: frames its 50 m circle, close enough to see the halo', () => {
    const v = fogView([A])!
    expect(v.focused).toBe(false)
    expect(v.maxZoom).toBe(FOG_FIT_MAX_ZOOM)
    expect(v.bounds).toEqual(clearedBounds([A]))
  })

  it('everything within the span: frames all of it', () => {
    const pts = [A, east(A, 800), offsetNorth(A, 900)]
    expect(FOG_FIT_SPAN_M).toBeGreaterThan(900)
    const v = fogView(pts)!
    expect(v.focused).toBe(false)
    expect(v.bounds).toEqual(clearedBounds(pts))
  })

  it('scattered across the city: frames the densest neighbourhood, not the whole city', () => {
    const cluster = [A, east(A, 100), east(A, 200), offsetNorth(A, 150)]
    const far1 = east(A, 9000)
    const far2 = offsetNorth(A, 8000)
    const v = fogView([far1, ...cluster, far2])!
    expect(v.focused).toBe(true)
    for (const p of cluster) expect(inside(v.bounds, p)).toBe(true)
    expect(inside(v.bounds, far1)).toBe(false)
    expect(inside(v.bounds, far2)).toBe(false)
    const widthM = distanceMeters([v.bounds[0], A[1]], [v.bounds[2], A[1]])
    expect(widthM).toBeLessThan(2 * FOG_CLUSTER_M + 2 * FOG_RADIUS_M)
  })

  it('ties go to the most recent check-in (later in the list)', () => {
    const a = A
    const b = east(A, 9000)
    const v = fogView([a, b])!
    expect(v.focused).toBe(true)
    expect(inside(v.bounds, b)).toBe(true)
    expect(inside(v.bounds, a)).toBe(false)
  })
})
