import { describe, expect, it } from 'vitest'
import { boundsAround, circleRing } from '../nearby'
import { distanceMeters, type LngLat } from '../geo'

const c: LngLat = [121.5287, 25.0335]

describe('nearby', () => {
  it('bounds extend the radius in each direction', () => {
    const [[w, s], [e, n]] = boundsAround(c, 300)
    expect(distanceMeters(c, [e, c[1]])).toBeCloseTo(300, -1)
    expect(distanceMeters(c, [w, c[1]])).toBeCloseTo(300, -1)
    expect(distanceMeters(c, [c[0], n])).toBeCloseTo(300, -1)
    expect(distanceMeters(c, [c[0], s])).toBeCloseTo(300, -1)
  })
  it('circle points sit on the radius and close the ring', () => {
    const ring = circleRing(c, 300)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    for (const p of ring) expect(distanceMeters(c, p)).toBeCloseTo(300, -1)
  })
})
