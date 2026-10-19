import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEMO } from '../../../config'
import { offsetNorth } from '../../../lib/geo'
import { leaveTarget, parseTreeTile, pickNearby, tilesCovering } from '../nearby'

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
