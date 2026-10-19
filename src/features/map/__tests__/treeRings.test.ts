import { describe, expect, it } from 'vitest'
import { CHECKIN } from '../../../config'
import { checkinRadius, offsetNorth, type LngLat } from '../../../lib/geo'
import { arcOffsets, farNote, rangeInfo, ringActions } from '../treeRings'

const tree: LngLat = [121.5287, 25.0335]
const demoAnchor = (lngLat: LngLat) => ({ lngLat, source: 'demo' as const })
const gpsAnchor = (lngLat: LngLat, accuracy: number) => ({ lngLat, source: 'gps' as const, accuracy })

describe('rangeInfo', () => {
  it('uses checkinRadius (Demo accuracy 5 m → 35 m): inside 0.5 m is in range, outside 0.5 m is not', () => {
    const r = checkinRadius(CHECKIN.demoAccuracy)
    expect(r).toBe(35)
    expect(rangeInfo(demoAnchor(offsetNorth(tree, r - 0.5)), tree).inRange).toBe(true)
    const out = rangeInfo(demoAnchor(offsetNorth(tree, r + 0.5)), tree)
    expect(out.inRange).toBe(false)
    expect(out.remaining).toBe(1)
  })
  it('follows the GPS accuracy like check-in does', () => {
    const at = offsetNorth(tree, 50)
    expect(rangeInfo(gpsAnchor(at, 0), tree).inRange).toBe(false) // 30 m
    expect(rangeInfo(gpsAnchor(at, 30), tree).inRange).toBe(true) // 60 m
  })
  it('counts the metres still to walk, rounded up', () => {
    const info = rangeInfo(demoAnchor(offsetNorth(tree, 60)), tree)
    expect(info.remaining).toBe(25)
  })
  it('treats no location (fallback) as far, with no number', () => {
    const info = rangeInfo({ lngLat: tree, source: 'fallback' }, tree)
    expect(info).toEqual({ distance: null, inRange: false, remaining: null })
  })
})

describe('farNote', () => {
  it('says how far to go, calmly', () => {
    expect(farNote({ distance: 60, inRange: false, remaining: 25 })).toBe('走近一點，還有約 25 公尺')
  })
  it('has a different line when there is no position', () => {
    expect(farNote({ distance: null, inRange: false, remaining: null })).toContain('位置')
  })
  it('is empty in range', () => {
    expect(farNote({ distance: 3, inRange: true, remaining: null })).toBe('')
  })
})

describe('ringActions', () => {
  const near = { distance: 3, inRange: true, remaining: null }
  const far = { distance: 60, inRange: false, remaining: 25 }
  it('in range all three are active, in a fixed order (掃樹牌 is the big button, not a ring)', () => {
    const a = ringActions('DA0030211045', near)
    expect(a.map((x) => x.id)).toEqual(['whisper', 'info', 'report'])
    expect(a.every((x) => x.enabled)).toBe(true)
  })
  it('out of range only 樹的資料 is active; the others say why in their aria-label', () => {
    const a = ringActions('DA0030211045', far)
    expect(a.filter((x) => x.enabled).map((x) => x.id)).toEqual(['info'])
    for (const x of a.filter((x) => !x.enabled)) expect(x.aria).toContain('走近一點，還有約 25 公尺')
    expect(a.find((x) => x.id === 'info')!.aria).toBe('樹的資料')
  })
  it('no location: same as far', () => {
    const a = ringActions('X', { distance: null, inRange: false, remaining: null })
    expect(a.filter((x) => x.enabled).map((x) => x.id)).toEqual(['info'])
  })
  it('routes: whisper and report land on page anchors; there is no scan ring', () => {
    const a = Object.fromEntries(ringActions('DA0030211045-001', near).map((x) => [x.id, x]))
    expect(a.scan).toBeUndefined()
    expect(a.whisper).toMatchObject({ to: '/tree/DA0030211045-001', hash: 'whisper' })
    expect(a.info).toMatchObject({ to: '/tree/DA0030211045-001' })
    expect(a.info.hash).toBeUndefined()
    expect(a.report).toMatchObject({ to: '/tree/DA0030211045-001', hash: 'report' })
  })
})

describe('ringActions in Demo (走過去)', () => {
  const far = { distance: 60, inRange: false, remaining: 25 }
  it('adds a ring 走過去, always active, only in Demo', () => {
    expect(ringActions('X', far).some((x) => x.id === 'walk')).toBe(false)
    const a = ringActions('X', far, true)
    expect(a.map((x) => x.id)).toEqual(['whisper', 'info', 'report', 'walk'])
    expect(a.find((x) => x.id === 'walk')).toMatchObject({ label: '走過去', enabled: true })
  })
  it('after walking (in range) every ring is active', () => {
    expect(ringActions('X', { distance: 10, inRange: true, remaining: null }, true).every((x) => x.enabled)).toBe(true)
  })
  it('5 rings fan wider so 56 px discs stay apart (>= 56 px between centres)', () => {
    const o = arcOffsets(5, 118)
    for (let i = 1; i < o.length; i++) expect(Math.hypot(o[i].x - o[i - 1].x, o[i].y - o[i - 1].y)).toBeGreaterThanOrEqual(56)
    expect(Math.max(...o.map((p) => Math.abs(p.x))) + 36).toBeLessThanOrEqual(180) // 360 px 寬，樹在中間
  })
})

describe('arcOffsets', () => {
  it('puts the middle of the arc straight below the tree and mirrors left/right', () => {
    const o = arcOffsets(3, 100, 120)
    expect(o[1]).toEqual({ x: 0, y: 100 })
    expect(o[0].x).toBeCloseTo(-o[2].x)
    expect(o[0].y).toBeCloseTo(o[2].y)
    expect(o[0].x).toBeLessThan(0)
  })
  it('keeps every point on the circle and left to right in order', () => {
    const o = arcOffsets(4, 118)
    for (const p of o) expect(Math.hypot(p.x, p.y)).toBeCloseTo(118, 0)
    expect(o.map((p) => p.x)).toEqual([...o.map((p) => p.x)].sort((a, b) => a - b))
  })
  it('fits a 360 px screen with 56 px circles', () => {
    const o = arcOffsets(4, 118)
    expect(Math.max(...o.map((p) => Math.abs(p.x))) + 28).toBeLessThanOrEqual(180)
    // neighbours do not overlap
    for (let i = 1; i < o.length; i++) expect(Math.hypot(o[i].x - o[i - 1].x, o[i].y - o[i - 1].y)).toBeGreaterThanOrEqual(56)
  })
  it('handles 0 and 1', () => {
    expect(arcOffsets(0, 100)).toEqual([])
    expect(arcOffsets(1, 100)).toEqual([{ x: 0, y: 100 }])
  })
})
