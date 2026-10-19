import { describe, expect, it } from 'vitest'
import type { ActiveTour } from '../../../store'
import type { Checkin } from '../../../store/types'
import { boundsAround } from '../../../lib/nearby'
import { distanceMeters } from '../../../lib/geo'
import { doneStopIds, movableBounds, tourBarText, tourBounds, tourLine, unionBounds } from '../tour'

const stops = Array.from({ length: 8 }, (_, i) => ({ id: `DA00302110${40 + i}`, lngLat: [121.528 + i * 0.0004, 25.033 + i * 0.0003] as [number, number] }))
const tour: ActiveTour = {
  village: '光明里',
  district: '大安區',
  start: [121.5275, 25.0328],
  stops,
  path: [[121.5275, 25.0328], ...stops.map((s) => s.lngLat)],
  meters: 340,
  minutes: 5,
  startedAt: 1000,
}
const checkin = (treeId: string, at: number, result: Checkin['result'] = 'success'): Checkin => ({ treeId, at, result })

describe('doneStopIds', () => {
  it('only check-ins at or after startedAt count', () => {
    const done = doneStopIds(tour, [checkin(stops[0].id, 999), checkin(stops[1].id, 1000), checkin(stops[2].id, 5000)])
    expect([...done].sort()).toEqual([stops[1].id, stops[2].id])
  })
  it('success and farView both count; a tree checked in twice counts once', () => {
    const done = doneStopIds(tour, [checkin(stops[0].id, 2000, 'farView'), checkin(stops[0].id, 3000), checkin(stops[3].id, 3000)])
    expect(done.size).toBe(2)
  })
  it('trees that are not stops do not count; whole TreeID is compared (-001 suffix is another tree)', () => {
    const done = doneStopIds(tour, [checkin('DA9999999999', 2000), checkin(`${stops[0].id}-001`, 2000)])
    expect(done.size).toBe(0)
  })
  it('no check-ins, no done stops', () => {
    expect(doneStopIds(tour, []).size).toBe(0)
  })
})

describe('tourBarText', () => {
  it('shows progress and the planned distance', () => {
    expect(tourBarText(tour, 0)).toBe('光明里路線・已點亮 0／8 棵・約 340 公尺')
    expect(tourBarText(tour, 2)).toBe('光明里路線・已點亮 2／8 棵・約 340 公尺')
  })
  it('uses kilometres from 1 km', () => {
    expect(tourBarText({ ...tour, meters: 1234 }, 3)).toBe('光明里路線・已點亮 3／8 棵・約 1.2 公里')
  })
  it('says the route is finished when every stop is lit', () => {
    expect(tourBarText(tour, 8)).toBe('這條路線走完了！')
  })
})

describe('movable bounds with a tour', () => {
  const anchor = tour.start
  it('without a tour it is the usual circle around the person', () => {
    expect(movableBounds(anchor, 300, null)).toEqual(boundsAround(anchor, 300))
  })
  it('with a tour it contains the person circle and the whole tour with 300 m to spare', () => {
    const b = movableBounds(anchor, 300, tour)
    const near = boundsAround(anchor, 300)
    expect(b[0][0]).toBeLessThanOrEqual(near[0][0])
    expect(b[1][1]).toBeGreaterThanOrEqual(near[1][1])
    const t = tourBounds(tour)
    expect(b[0][0]).toBeLessThan(t[0][0])
    expect(b[1][0]).toBeGreaterThan(t[1][0])
    expect(b[1][1]).toBeGreaterThan(t[1][1])
    // 路線右上角（最後一站）到範圍邊緣約 300 m
    const last = stops[7].lngLat
    expect(distanceMeters(last, [b[1][0], last[1]])).toBeGreaterThan(290)
  })
  it('tourBounds covers start, path and stops', () => {
    const [sw, ne] = tourBounds(tour)
    expect(sw).toEqual([121.5275, 25.0328])
    expect(ne).toEqual(stops[7].lngLat)
  })
  it('unionBounds takes the outer edges', () => {
    expect(unionBounds([[0, 0], [1, 1]], [[-1, 0.5], [0.5, 3]])).toEqual([[-1, 0], [1, 3]])
  })
})

it('tourLine is a LineString along the path', () => {
  const f = tourLine(tour)
  expect(f.geometry.type).toBe('LineString')
  expect(f.geometry.coordinates).toBe(tour.path)
})
