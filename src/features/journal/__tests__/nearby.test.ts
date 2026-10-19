import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEMO } from '../../../config'
import { offsetNorth } from '../../../lib/geo'
import { bearingTo, compassLabel, leaveTarget, treeNumberTail, nearbyAction, nearbyLabel, parseTreeTile, pickNearby, tilesCovering } from '../nearby'

const c = DEMO.center
describe('pickNearby', () => {
  it('sorts nearest first, filters by radius, dedupes, caps', () => {
    const pts = [
      { id: 'far', lngLat: offsetNorth(c, 400) },
      { id: 'b', lngLat: offsetNorth(c, 60) },
      { id: 'a', lngLat: offsetNorth(c, 10) },
      { id: 'a', lngLat: offsetNorth(c, 10) },
      { id: 'c', lngLat: offsetNorth(c, 120) },
    ]
    const r = pickNearby(pts, c, 150, 8)
    expect(r.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(r[0].distance).toBeGreaterThan(9)
    expect(pickNearby(pts, c, 150, 2).map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('leaveTarget', () => {
  it('goes to the tree whisper when checked in, else to scan with a hint', () => {
    expect(leaveTarget('DA0030211045', true).to).toBe('/tree/DA0030211045#whisper')
    expect(leaveTarget('DA0030211045-001', false)).toEqual({ to: '/scan', state: { hintTreeId: 'DA0030211045-001' } })
  })
})

describe('tile decoding (real data)', () => {
  it('finds trees near the demo center in the z16 tiles', () => {
    const all = tilesCovering(c, 150).flatMap(([x, y]) => {
      try {
        return parseTreeTile(new Uint8Array(readFileSync(`public/data/tree-tiles/16/${x}/${y}.pbf`)), 16, x, y)
      } catch {
        return []
      }
    })
    const near = pickNearby(all, c, 150)
    expect(near.length).toBeGreaterThan(0)
    expect(near.every((t) => t.distance <= 150)).toBe(true)
  })
})

describe('nearbyAction', () => {
  it('in check-in range: 留言', () => {
    expect(nearbyAction(20, 35, false)).toBe('leave')
    expect(nearbyAction(35, 35, true)).toBe('leave')
  })
  it('too far: Demo walks over, real GPS shows the route', () => {
    expect(nearbyAction(60, 35, true)).toBe('walk')
    expect(nearbyAction(60, 35, false)).toBe('route')
  })
})

describe('nearbyLabel', () => {
  it('留言 only promises what it does: without an on-site check-in it is 掃樹牌留言', () => {
    expect(nearbyLabel('leave')).toBe('掃樹牌留言')
    expect(nearbyLabel('leave', false)).toBe('掃樹牌留言')
    expect(nearbyLabel('leave', true)).toBe('留言')
  })
  it('walk and route keep their labels', () => {
    expect(nearbyLabel('walk')).toBe('走過去')
    expect(nearbyLabel('route', true)).toBe('怎麼走')
  })
})

describe('distinguishing details', () => {
  it('bearing and compass label', () => {
    const north = offsetNorth(c, 50)
    expect(bearingTo(c, north)).toBeCloseTo(0, 0)
    expect(compassLabel(bearingTo(c, north))).toBe('往北')
    const east: [number, number] = [c[0] + 0.001, c[1]]
    expect(compassLabel(bearingTo(c, east))).toBe('往東')
    expect(compassLabel(bearingTo(c, [c[0] - 0.001, c[1] - 0.001]))).toBe('往西南')
    expect(compassLabel(359)).toBe('往北')
    expect(compassLabel(-90)).toBe('往西')
  })
  it('tree number tail', () => {
    expect(treeNumberTail('DA0030211045')).toBe('#211045')
    expect(treeNumberTail('SL0560111023-001')).toBe('#111023-001')
    expect(treeNumberTail('X12')).toBe('#12')
  })
})
