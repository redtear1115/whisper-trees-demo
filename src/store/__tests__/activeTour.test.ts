import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearActiveTour, getActiveTour, parseActiveTour, setActiveTour, type ActiveTour } from '..'

/** Vitest 跑在 node，沒有 sessionStorage：換一個最小的替身 */
function stubSession() {
  const data = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
  })
  return data
}

const tour: ActiveTour = {
  village: '光明里',
  district: '大安區',
  start: [121.5287, 25.0335],
  stops: [
    { id: 'DA0030211045', lngLat: [121.5288, 25.0336] },
    { id: 'DA0030211046-001', lngLat: [121.5291, 25.0339] },
  ],
  path: [[121.5287, 25.0335], [121.5288, 25.0336], [121.5291, 25.0339]],
  meters: 340,
  minutes: 5,
  startedAt: 1_760_000_000_000,
}

let data: Map<string, string>
beforeEach(() => void (data = stubSession()))
afterEach(() => vi.unstubAllGlobals())

describe('active tour (store, sessionStorage)', () => {
  it('is null until a tour is started', () => {
    expect(getActiveTour()).toBeNull()
  })
  it('round-trips a tour and keeps the whole TreeID (with -001 suffix)', () => {
    setActiveTour(tour)
    expect(getActiveTour()).toEqual(tour)
    expect(getActiveTour()?.stops[1].id).toBe('DA0030211046-001')
  })
  it('lives in sessionStorage only', () => {
    setActiveTour(tour)
    expect(data.size).toBe(1)
  })
  it('clear removes it', () => {
    setActiveTour(tour)
    clearActiveTour()
    expect(getActiveTour()).toBeNull()
    expect(data.size).toBe(0)
  })
  it('starting another tour replaces the first', () => {
    setActiveTour(tour)
    setActiveTour({ ...tour, village: '龍泉里', startedAt: tour.startedAt + 1 })
    expect(getActiveTour()?.village).toBe('龍泉里')
  })
  it('does not throw when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => setActiveTour(tour)).not.toThrow()
    expect(() => clearActiveTour()).not.toThrow()
    expect(getActiveTour()).toBeNull()
  })
})

describe('parseActiveTour ignores garbage', () => {
  it('null, empty, not JSON, wrong shapes', () => {
    expect(parseActiveTour(null)).toBeNull()
    expect(parseActiveTour('')).toBeNull()
    expect(parseActiveTour('nope')).toBeNull()
    expect(parseActiveTour('null')).toBeNull()
    expect(parseActiveTour('42')).toBeNull()
    expect(parseActiveTour('[]')).toBeNull()
    expect(parseActiveTour('{}')).toBeNull()
  })
  it('missing or bad fields', () => {
    const bad = (patch: Record<string, unknown>) => parseActiveTour(JSON.stringify({ ...tour, ...patch }))
    expect(bad({})).toEqual(tour)
    expect(bad({ village: 5 })).toBeNull()
    expect(bad({ start: [121.5] })).toBeNull()
    expect(bad({ start: ['a', 'b'] })).toBeNull()
    expect(bad({ stops: [] })).toBeNull()
    expect(bad({ stops: [{ id: 1, lngLat: [1, 2] }] })).toBeNull()
    expect(bad({ stops: [{ id: 'DA1', lngLat: [1] }] })).toBeNull()
    expect(bad({ path: [[1, 2], 'x'] })).toBeNull()
    expect(bad({ meters: 'far' })).toBeNull()
    expect(bad({ startedAt: null })).toBeNull()
  })
  it('a corrupt stored value reads as no tour', () => {
    data.set('whisper-trees:active-tour', '{"village":"光明里"')
    expect(getActiveTour()).toBeNull()
  })
})
