import { readFileSync, readdirSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { distanceMeters, type LngLat } from '../geo'
import { DISTRICT_BBOX, planTreeTour, prefixAt, prefixAtAsync, distanceText, routeBetween, routeLabel, routeMidpoint, walkMinutes, type RoadGraph } from '../route'

// A tiny town on a metre grid near Taipei (1 unit = 0.0009 deg lat ≈ 100 m).
//
//   n3 ---- n4 ---- n5      y = 2
//   |               |
//   n0 ---- n1 ---- n2      y = 0     (n0-n3 and n2-n5 are the two long ways round)
//                           island: n6 ---- n7 at y = -5 (not connected)
const ORIGIN: LngLat = [121.5, 25.0]
const KX = 111_320 * Math.cos((25 * Math.PI) / 180)
const pt = (x: number, y: number): LngLat => [ORIGIN[0] + (x * 100) / KX, ORIGIN[1] + (y * 100) / 110_540]
const nodes: LngLat[] = [pt(0, 0), pt(1, 0), pt(2, 0), pt(0, 2), pt(1, 2), pt(2, 2), pt(0, -5), pt(1, -5)]
const len = (a: number, b: number) => distanceMeters(nodes[a], nodes[b])
const graph: RoadGraph = {
  prefix: 'XX',
  nodes,
  edges: [
    [0, 1, len(0, 1), []],
    [1, 2, len(1, 2), []],
    [0, 3, len(0, 3), [pt(0, 1)]], // has a middle point
    [3, 4, len(3, 4), []],
    [4, 5, len(4, 5), []],
    [2, 5, len(2, 5), [pt(2, 1)]],
    [6, 7, len(6, 7), []],
  ],
}

describe('walkMinutes', () => {
  it('is 4.5 km/h rounded up, at least 1', () => {
    expect(walkMinutes(0)).toBe(1)
    expect(walkMinutes(75)).toBe(1)
    expect(walkMinutes(76)).toBe(2)
    expect(walkMinutes(120)).toBe(2)
    expect(walkMinutes(4500)).toBe(60)
  })
})

describe('labels', () => {
  it('says metres to the nearest 10 below 1 km, km with one decimal above', () => {
    expect(distanceText(118)).toBe('約 120 公尺')
    expect(distanceText(3)).toBe('約 10 公尺')
    expect(distanceText(1240)).toBe('約 1.2 公里')
    expect(routeLabel({ meters: 118, minutes: 2 })).toBe('約 120 公尺・步行 2 分鐘')
  })
  it('finds the point half way along a route', () => {
    const mid = routeMidpoint([pt(0, 0), pt(1, 0), pt(1, 1)]) // 100 m east then 100 m north: half = the corner
    expect(distanceMeters(mid, pt(1, 0))).toBeLessThan(0.5)
    const mid2 = routeMidpoint([pt(0, 0), pt(2, 0)])
    expect(distanceMeters(mid2, pt(1, 0))).toBeLessThan(0.5)
    expect(routeMidpoint([pt(0, 0)])).toEqual(pt(0, 0))
  })
})

describe('routeBetween on a synthetic graph', () => {
  it('finds the shortest path along the roads and starts/ends exactly at the given points', () => {
    const from = pt(0, 0)
    const to = pt(2, 0)
    const r = routeBetween(graph, from, to)!
    expect(r.coords[0]).toEqual(from)
    expect(r.coords[r.coords.length - 1]).toEqual(to)
    expect(r.meters).toBeCloseTo(len(0, 1) + len(1, 2), 0)
    expect(r.minutes).toBe(walkMinutes(r.meters))
  })

  it('snaps both ends to the nearest point of an edge and adds the straight snap legs', () => {
    const from = pt(0.5, 0.3) // 30 m north of edge 0-1
    const to = pt(1.5, -0.4) // 40 m south of edge 1-2
    const r = routeBetween(graph, from, to)!
    // 30 m + 40 m of snap legs, and 100 m of road between the feet of the perpendiculars
    expect(r.meters).toBeGreaterThan(165)
    expect(r.meters).toBeLessThan(175)
    expect(r.coords[0]).toEqual(from)
    expect(r.coords[1][1]).toBeCloseTo(ORIGIN[1], 6) // foot of the perpendicular is on the road
    expect(r.coords.some((c) => c[0] === nodes[1][0] && c[1] === nodes[1][1])).toBe(true) // passes the junction
  })

  it('walks along a single edge when both ends snap to it', () => {
    const r = routeBetween(graph, pt(0.2, 0), pt(0.7, 0))!
    expect(r.meters).toBeCloseTo(50, 0)
  })

  it('takes the shorter way round the block', () => {
    // bottom: 50 + 200 + 50 = 300 m; top: 150 + 200 + 150 = 500 m
    const r = routeBetween(graph, pt(0, 0.5), pt(2, 0.5))!
    expect(r.meters).toBeGreaterThan(297)
    expect(r.meters).toBeLessThan(303)
  })

  it('follows the middle points of an edge', () => {
    const r = routeBetween(graph, pt(0, 1.5), pt(0.5, 0))!
    expect(r.meters).toBeCloseTo(200, -1)
    expect(r.coords.some((c) => c[0] === pt(0, 1)[0] && c[1] === pt(0, 1)[1])).toBe(true)
  })

  it('goes round when there is no direct edge (0 → 5: 400 m either way)', () => {
    const r = routeBetween(graph, nodes[0], nodes[5])!
    expect(r.meters).toBeGreaterThan(398)
    expect(r.meters).toBeLessThan(402)
    expect(r.meters).toBeGreaterThan(distanceMeters(nodes[0], nodes[5]))
  })

  it('returns null when the two ends are on pieces that are not connected', () => {
    expect(routeBetween(graph, pt(0, 0), pt(0.5, -5))).toBeNull()
  })

  it('returns null when there is no road within 250 m, or no graph at all', () => {
    expect(routeBetween(graph, pt(0, 0), pt(0, 20))).toBeNull()
    expect(routeBetween({ prefix: 'XX', nodes: [], edges: [] }, pt(0, 0), pt(1, 0))).toBeNull()
  })

  it('is symmetric', () => {
    const a = routeBetween(graph, pt(0.3, 0.2), pt(1.8, 1.7))!
    const b = routeBetween(graph, pt(1.8, 1.7), pt(0.3, 0.2))!
    expect(a.meters).toBeCloseTo(b.meters, 3)
  })
})

describe('planTreeTour', () => {
  const stop = (id: string, x: number, y: number) => ({ id, lngLat: pt(x, y) })

  it('visits the nearest stop by road first, then the next nearest from there', () => {
    const start = pt(0, 0)
    // near (0,1) and mid (1,0) are both 100 m by road, far (2,2) is last; either order totals 600 m
    const tour = planTreeTour(graph, start, [stop('far', 2, 2), stop('mid', 1, 0), stop('near', 0, 1)])!
    expect(tour.stops).toHaveLength(3)
    expect(tour.stops[2].id).toBe('far')
    expect(tour.path[0]).toEqual(start)
    expect(tour.path[tour.path.length - 1]).toEqual(pt(2, 2))
    expect(tour.meters).toBeGreaterThan(595)
    expect(tour.meters).toBeLessThan(605)
    expect(tour.minutes).toBe(walkMinutes(tour.meters))
  })

  it('orders by road distance: B (100 m) before A (200 m), then 300 m back along the bottom and up', () => {
    const tour = planTreeTour(graph, pt(0, 0), [stop('A', 0, 2), stop('B', 1, 0)])!
    expect(tour.stops.map((s) => s.id)).toEqual(['B', 'A'])
    expect(tour.meters).toBeGreaterThan(395)
    expect(tour.meters).toBeLessThan(405)
  })

  it('does not repeat the join points and respects maxStops', () => {
    const tour = planTreeTour(graph, pt(0, 0), [stop('a', 1, 0), stop('b', 2, 0), stop('c', 2, 2)], 2)!
    expect(tour.stops.map((s) => s.id)).toEqual(['a', 'b'])
    for (let i = 1; i < tour.path.length; i++) {
      expect(tour.path[i]).not.toEqual(tour.path[i - 1])
    }
  })

  it('skips stops that cannot be reached and returns null when none can', () => {
    const tour = planTreeTour(graph, pt(0, 0), [stop('island', 0.5, -5), stop('ok', 1, 0)])!
    expect(tour.stops.map((s) => s.id)).toEqual(['ok'])
    expect(planTreeTour(graph, pt(0, 0), [stop('island', 0.5, -5)])).toBeNull()
    expect(planTreeTour(graph, pt(0, 0), [])).toBeNull()
  })

  it('defaults to 8 stops', () => {
    const many = Array.from({ length: 12 }, (_, i) => stop(`t${i}`, (i % 3) * 0.7, 0))
    expect(planTreeTour(graph, pt(0, 0), many)!.stops).toHaveLength(8)
  })
})

describe('prefixAt', () => {
  it('matches the district boxes in public/data/villages (update DISTRICT_BBOX if the data changes)', () => {
    const dir = 'public/data/villages'
    for (const f of readdirSync(dir)) {
      const prefix = f.replace('.json', '')
      const vs = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).villages as { bbox: number[] }[]
      const box = [0, 1, 2, 3].map((i) => (i < 2 ? Math.min : Math.max)(...vs.map((v) => v.bbox[i])))
      box.forEach((v, i) => expect(v).toBeCloseTo(DISTRICT_BBOX[prefix][i], 3))
    }
  })
  it('finds a district, and null outside the city', () => {
    expect(prefixAt([121.55, 25.025])).toBe('DA')
    expect(prefixAt([121.5, 25.0])).toBeNull() // Xindian, not in Taipei
    expect(prefixAt([121.59, 25.15])).toBe('SL')
  })
  describe('prefixAtAsync', () => {
    afterEach(() => vi.unstubAllGlobals())
    it('uses the village polygons where district boxes overlap (a DA tree near the JJ border)', async () => {
      vi.stubGlobal('fetch', async (url: string) => ({ ok: true, json: async () => JSON.parse(readFileSync(`public${url}`, 'utf8')) }))
      const da = JSON.parse(readFileSync('public/data/trees/DA.json', 'utf8')).trees['DA0030211045']
      expect(await prefixAtAsync([da[0], da[1]])).toBe('DA')
      expect(await prefixAtAsync([121.5, 25.0])).toBeNull()
    })
  })
})

describe('real road graph (DA, generated by scripts/build_road_graph.py)', () => {
  const file = JSON.parse(readFileSync('public/data/roads/DA.json', 'utf8'))
  const da: RoadGraph = { prefix: 'DA', nodes: file.nodes, edges: file.edges }
  const trees = Object.entries(JSON.parse(readFileSync('public/data/trees/DA.json', 'utf8')).trees as Record<string, number[]>)

  it('is a plausible district graph', () => {
    expect(da.nodes.length).toBeGreaterThan(1000)
    expect(da.edges.length).toBeGreaterThan(da.nodes.length)
    expect(da.edges.every(([a, b, l]) => a < da.nodes.length && b < da.nodes.length && l > 0)).toBe(true)
  })

  it('routes between two trees about 600 m apart: longer than straight, shorter than 3x', () => {
    const ap: LngLat = [trees[0][1][0], trees[0][1][1]]
    const b = trees.find(([, t]) => {
      const d = distanceMeters(ap, [t[0], t[1]])
      return d > 500 && d < 700
    })!
    const bp: LngLat = [b[1][0], b[1][1]]
    const straight = distanceMeters(ap, bp)
    const t0 = performance.now()
    const r = routeBetween(da, ap, bp)!
    const ms = performance.now() - t0
    expect(r).not.toBeNull()
    expect(r.meters).toBeGreaterThan(straight)
    expect(r.meters).toBeLessThan(straight * 3)
    expect(r.minutes).toBe(Math.ceil(r.meters / 75))
    // the drawn line is as long as the claimed distance (within the 5 m simplification)
    const drawn = r.coords.slice(1).reduce((s, c, i) => s + distanceMeters(r.coords[i], c), 0)
    expect(Math.abs(drawn - r.meters) / r.meters).toBeLessThan(0.05)
    expect(ms).toBeLessThan(500)
  })

  it('the demo tree and a far tree (DA0030211054) route sensibly', () => {
    const lookup = Object.fromEntries(trees)
    const near = lookup['DA0030211045']
    const far = lookup['DA0030211054']
    const r = routeBetween(da, [near[0], near[1]], [far[0], far[1]])!
    expect(r).not.toBeNull()
    expect(r.meters).toBeGreaterThan(distanceMeters([near[0], near[1]], [far[0], far[1]]) - 1)
    expect(r.meters).toBeLessThan(distanceMeters([near[0], near[1]], [far[0], far[1]]) * 3)
  })

  it('plans a tour over 8 real trees', () => {
    const start: LngLat = [trees[0][1][0], trees[0][1][1]]
    const cands = trees
      .map(([id, t]) => ({ id, lngLat: [t[0], t[1]] as LngLat }))
      .filter((c) => distanceMeters(start, c.lngLat) < 500)
      .slice(0, 20)
    const tour = planTreeTour(da, start, cands)!
    expect(tour.stops.length).toBe(8)
    expect(tour.meters).toBeGreaterThan(0)
    expect(tour.path[0]).toEqual(start)
  })
})
