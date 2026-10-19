import { describe, expect, it } from 'vitest'
import { CHECKIN } from '../../config'
import { rangeInfo } from '../../features/map/treeRings'
import { distanceMeters, judgeCheckin, offsetNorth, walkTarget, type LngLat } from '../geo'

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

describe('walkTarget (Demo 走過去)', () => {
  const from = offsetNorth(tree, 100) // 人在樹北邊 100 m
  it('stands demoOffsetMeters from the tree, on the side the person came from', () => {
    const p = walkTarget(from, tree)
    expect(distanceMeters(p, tree)).toBeCloseTo(CHECKIN.demoOffsetMeters, 1)
    expect(p[1]).toBeGreaterThan(tree[1]) // 北邊
    expect(p[0]).toBeCloseTo(tree[0], 8)
  })
  it('works from any direction', () => {
    const east: LngLat = [tree[0] + 0.001, tree[1] + 0.001]
    const p = walkTarget(east, tree)
    expect(distanceMeters(p, tree)).toBeCloseTo(CHECKIN.demoOffsetMeters, 1)
    expect(p[0]).toBeGreaterThan(tree[0])
    expect(p[1]).toBeGreaterThan(tree[1])
  })
  it('lands inside the check-in radius, so the rings light up and a scan succeeds', () => {
    const p = walkTarget(from, tree)
    expect(rangeInfo({ lngLat: p, source: 'demo' }, tree).inRange).toBe(true)
    expect(judgeCheckin(tree, '', { lngLat: p, accuracy: CHECKIN.demoAccuracy }).kind).toBe('success')
  })
  it('stays put when already closer than the offset (or on top of the tree)', () => {
    const near = offsetNorth(tree, 4)
    expect(walkTarget(near, tree)).toEqual(near)
    expect(walkTarget(tree, tree)).toEqual(tree)
  })
})
