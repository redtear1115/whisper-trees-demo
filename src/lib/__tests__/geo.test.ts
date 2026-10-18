import { describe, expect, it } from 'vitest'
import { distanceMeters, judgeCheckin, offsetNorth, type LngLat } from '../geo'

const tree: LngLat = [121.5287, 25.0335]
const at = (m: number, accuracy = 5) => ({ lngLat: offsetNorth(tree, m), accuracy })

describe('distanceMeters', () => {
  it('matches the offset', () => {
    expect(distanceMeters(tree, offsetNorth(tree, 100))).toBeCloseTo(100, 0)
  })
})

describe('judgeCheckin', () => {
  it('success when close', () => {
    expect(judgeCheckin(tree, '', at(20)).kind).toBe('success')
  })
  it('accuracy widens the limit up to 30 m', () => {
    expect(judgeCheckin(tree, '', at(50, 25)).kind).toBe('success')
    expect(judgeCheckin(tree, '', at(65, 100)).kind).toBe('tooFar')
  })
  it('far view for median-strip trees within 80 m', () => {
    expect(judgeCheckin(tree, '信義路二段北側安全島', at(70)).kind).toBe('farView')
    expect(judgeCheckin(tree, '安全島', at(90)).kind).toBe('tooFar')
  })
  it('too far otherwise, with distance', () => {
    const r = judgeCheckin(tree, '', at(70))
    expect(r.kind).toBe('tooFar')
    expect(r.kind === 'tooFar' && Math.round(r.distance)).toBe(70)
  })
  it('no location', () => {
    expect(judgeCheckin(tree, '', null).kind).toBe('noLocation')
  })
})
