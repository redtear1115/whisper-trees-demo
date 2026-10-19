import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Checkin } from '../../../store/types'
import type { Village } from '../../../lib/villages'
import { PREFIX_DISTRICT } from '../../game/districts'
import { INK_EDGE, NEIGHBOUR_FILL, PANEL_BG, RAMP_STEPS, TIER_TONES, contrast, rampColor, rampT, toneOf, villageFill, villageText } from '../colors'
import { creditText } from '../credit'
import { MIN_TARGET_PX, tapPadRadius, villageRows } from '../tap'
import { fitProjection, labelFits, unionBBox, villageLabel, villagePath } from '../projection'
import { boundsOf, labelPoint, parseRings, ringArea, ringCentroid } from '../svgPath'
import { litTreeIds, parseTreePoints, routeCandidates, tourSummary } from '../villageTrees'

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../../../public/data/${p}`, import.meta.url), 'utf8'))

describe('svg path', () => {
  it('parses relative M/l/z into absolute rings', () => {
    const rings = parseRings('M10 20l10 0 0 10 -10 0z M100 100l5 5 -5 0z')
    expect(rings).toEqual([
      [[10, 20], [20, 20], [20, 30], [10, 30]],
      [[100, 100], [105, 105], [100, 105]],
    ])
  })

  it('centroid of a square is its centre; label uses the largest ring', () => {
    const sq = (x: number, y: number, s: number): [number, number][] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]
    expect(ringCentroid(sq(0, 0, 10))).toEqual([5, 5])
    expect(Math.abs(ringArea(sq(0, 0, 10)))).toBe(100)
    expect(labelPoint([sq(0, 0, 2), sq(100, 100, 10)])).toEqual([105, 105])
    expect(labelPoint([])).toBeNull()
    expect(boundsOf([sq(0, 0, 2), sq(5, 5, 10)])).toEqual([0, 0, 15, 15])
  })

  it('every real district has a label point inside the Taipei bounds', () => {
    const o = read('taipei-outline.json')
    const b = boundsOf(parseRings(o.taipei))!
    for (const [name, d] of Object.entries(o.districts as Record<string, string>)) {
      const p = labelPoint(parseRings(d))
      expect(p, name).not.toBeNull()
      expect(p![0]).toBeGreaterThan(b[0])
      expect(p![0]).toBeLessThan(b[2])
      expect(p![1]).toBeGreaterThan(b[1])
      expect(p![1]).toBeLessThan(b[3])
    }
  })
})

describe('tier colours', () => {
  it('has five tones: a blank paper slot first, then ink that gets deeper up to gold', () => {
    expect(TIER_TONES.map((t) => t.key)).toEqual(['none', 'iron', 'bronze', 'silver', 'gold'])
    expect(new Set(TIER_TONES.map((t) => t.fill)).size).toBe(5)
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) * 0.2126 + parseInt(h.slice(3, 5), 16) * 0.7152 + parseInt(h.slice(5, 7), 16) * 0.0722
    // 鐵 → 銅 → 銀 一格比一格深（金是另一個色相，不比亮度）
    const [none, iron, bronze, silver] = TIER_TONES.map((t) => lum(t.fill))
    expect(none).toBeGreaterThan(iron)
    expect(iron).toBeGreaterThan(bronze)
    expect(bronze).toBeGreaterThan(silver)
    expect(toneOf(null).key).toBe('none')
    expect(toneOf('gold').key).toBe('gold')
  })

  it('label text reaches 4.5:1 on every tone', () => {
    for (const t of TIER_TONES) expect(contrast(t.text, t.fill), t.key).toBeGreaterThanOrEqual(4.5)
  })

  it('unstarted reads as paper, not as the panel: lighter than the panel and the old-paper neighbours', () => {
    const none = TIER_TONES[0].fill
    expect(none).not.toBe(PANEL_BG)
    expect(contrast(none, PANEL_BG)).toBeGreaterThanOrEqual(1.2)
    expect(contrast(none, NEIGHBOUR_FILL)).toBeGreaterThanOrEqual(1.3)
    expect(contrast(PANEL_BG, NEIGHBOUR_FILL)).toBeGreaterThanOrEqual(1.1)
  })

  it('the ink edge shows up against the panel and every tone (non-text 3:1)', () => {
    expect(contrast(INK_EDGE, PANEL_BG)).toBeGreaterThanOrEqual(3)
    for (const t of TIER_TONES) expect(contrast(INK_EDGE, t.fill), t.key).toBeGreaterThanOrEqual(3)
  })

  it('tones are tell-apart-able neighbours: each step differs by at least 1.15:1', () => {
    for (let i = 1; i < 4; i++) expect(contrast(TIER_TONES[i - 1].fill, TIER_TONES[i].fill), TIER_TONES[i].key).toBeGreaterThanOrEqual(1.15)
  })
})

describe('village ramp', () => {
  it('0 lit or no trees stays blank paper; one tree is already visibly different', () => {
    expect(rampT(0, 400)).toBe(0)
    expect(rampT(5, 0)).toBe(0)
    expect(villageFill(0, 400)).toBe(rampColor(0))
    expect(villageFill(0, 400)).toBe(TIER_TONES[0].fill)
    expect(rampT(1, 412)).toBeGreaterThanOrEqual(0.25)
    expect(villageFill(1, 412)).not.toBe(villageFill(0, 412))
    expect(contrast(villageFill(1, 412), villageFill(0, 412))).toBeGreaterThanOrEqual(1.15)
  })

  it('is monotonic, capped at 1, steps in five inks, and text stays readable', () => {
    let prev = 0
    const seen = new Set<string>()
    for (let lit = 0; lit <= 412; lit++) {
      const t = rampT(lit, 412)
      expect(t).toBeGreaterThanOrEqual(prev)
      expect(t).toBeLessThanOrEqual(1)
      prev = t
      seen.add(villageFill(lit, 412))
      expect(contrast(villageText(lit, 412), villageFill(lit, 412)), String(lit)).toBeGreaterThanOrEqual(4.5)
    }
    expect(rampT(412, 412)).toBe(1)
    expect(rampT(999, 412)).toBe(1)
    expect(seen.size).toBe(RAMP_STEPS.length)
  })

  it('every ink step can carry a label at 4.5:1 and is told apart from its neighbour', () => {
    RAMP_STEPS.forEach((st, i) => {
      const dark = contrast('#0b130d', st.fill)
      const light = contrast('#ffffff', st.fill)
      expect(Math.max(dark, light), st.fill).toBeGreaterThanOrEqual(4.5)
      if (i > 0) expect(contrast(RAMP_STEPS[i - 1].fill, st.fill), st.fill).toBeGreaterThanOrEqual(1.15)
    })
  })
})

describe('tap targets', () => {
  it('pads a shape that is under 44 px on either side, and leaves big ones alone', () => {
    // 1 單位 = 0.5 px：80 × 200 單位 = 40 × 100 px → 太窄
    const r = tapPadRadius([0, 0, 80, 200], 0.5)
    expect(r).not.toBeNull()
    expect(r! * 0.5 * 2).toBeGreaterThanOrEqual(MIN_TARGET_PX)
    expect(tapPadRadius([0, 0, 120, 120], 0.5)).toBeNull()
    expect(tapPadRadius([0, 0, 88, 88], 0.5)).toBeNull()
  })

  it('every real district is either big enough or gets a pad of at least 44 px', () => {
    const o = read('taipei-outline.json')
    const b = boundsOf(parseRings(o.taipei))!
    const pxPerUnit = 340 / (b[2] - b[0] + 140)
    const small: string[] = []
    for (const [name, d] of Object.entries(o.districts as Record<string, string>)) {
      const r = tapPadRadius(boundsOf(parseRings(d))!, pxPerUnit)
      if (r !== null) {
        small.push(name)
        expect(r * pxPerUnit * 2).toBeGreaterThanOrEqual(MIN_TARGET_PX)
      }
    }
    // 大同區是最小的一區，一定在名單裡
    expect(small).toContain('大同區')
  })
})

describe('village list order', () => {
  const v = (id: string, name: string, total: number) => ({ id, name, total, bbox: [0, 0, 1, 1], geometry: { type: 'Polygon', coordinates: [] } }) as unknown as Village
  const villages = [v('a', '仁愛里', 100), v('b', '大安里', 50), v('c', '空里', 0), v('d', '光復里', 80)]

  it('most lit first, ties by name, no-tree villages last, input untouched', () => {
    const lit = new Map([['a', 2], ['b', 5], ['d', 2]])
    const rows = villageRows(villages, lit)
    const ids = rows.map((r) => r.village.id)
    expect(ids[0]).toBe('b')
    expect(ids.slice(1, 3).sort()).toEqual(['a', 'd']) // 同樣多的依名稱排（排序規則看執行環境，這裡不釘死）
    expect(ids[3]).toBe('c')
    expect(rows.map((r) => r.lit)).toEqual([5, 2, 2, 0])
    expect(villages.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lists every real village of 大安 exactly once', () => {
    const da = read('villages/DA.json')
    const rows = villageRows(da.villages, new Map())
    expect(rows).toHaveLength(da.villages.length)
    expect(new Set(rows.map((r) => r.village.id)).size).toBe(da.villages.length)
  })
})

describe('credit line', () => {
  it('city level names OSM and ODbL; village level also names the village boundary licence', () => {
    expect(creditText('city')).toContain('ODbL')
    const v = creditText('district')
    expect(v).toContain('ODbL')
    expect(v).toContain('內政部國土測繪中心')
    expect(v).toContain('政府資料開放授權條款')
  })

  it('does not talk to citizens about placeholder art as a developer note', () => {
    expect(creditText('city')).not.toContain('佔位')
    expect(creditText('district')).not.toContain('佔位')
  })
})

describe('projection', () => {
  it('keeps aspect (east-west scaled by cos lat) and puts north at the top', () => {
    const p = fitProjection([121.5, 25.0, 121.6, 25.1], 360, 10, 100, 1000)
    const nw = p.project([121.5, 25.1])
    const se = p.project([121.6, 25.0])
    const w = se[0] - nw[0]
    const h = se[1] - nw[1]
    expect(nw[1]).toBeLessThan(se[1])
    expect(w / h).toBeCloseTo(Math.cos((25.05 * Math.PI) / 180), 2)
    expect(nw[0]).toBeGreaterThanOrEqual(10 - 1e-6)
    expect(se[0]).toBeLessThanOrEqual(350 + 1e-6)
  })

  it('clamps height and survives a degenerate box', () => {
    const tall = fitProjection([121.5, 25.0, 121.501, 25.1], 360, 10, 240, 440)
    expect(tall.height).toBe(440)
    const flat = fitProjection([121.5, 25.0, 121.6, 25.0001], 360, 10, 240, 440)
    expect(flat.height).toBe(240)
    const dot = fitProjection([121.5, 25.0, 121.5, 25.0])
    expect(Number.isFinite(dot.project([121.5, 25.0])[0])).toBe(true)
    expect(unionBBox([])).toBeNull()
    expect(unionBBox([[0, 0, 1, 1], [-1, 2, 0.5, 3]])).toEqual([-1, 0, 1, 3])
  })

  const square: Village = {
    id: 'v1',
    name: '測試里',
    total: 10,
    bbox: [121.5, 25.0, 121.51, 25.01],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[121.5, 25.0], [121.51, 25.0], [121.51, 25.01], [121.5, 25.01], [121.5, 25.0]],
        [[121.504, 25.004], [121.506, 25.004], [121.506, 25.006], [121.504, 25.006], [121.504, 25.004]],
      ],
    },
  }

  it('village path has a hole ring and the label sits near the middle', () => {
    const proj = fitProjection(square.bbox, 360, 10, 100, 1000)
    expect(villagePath(square, proj).match(/M/g)).toHaveLength(2)
    const l = villageLabel(square, proj)!
    expect(l.x).toBeCloseTo(proj.width / 2, 0)
    expect(l.w).toBeGreaterThan(100)
  })

  it('names are shown only when they fit', () => {
    const l = { x: 0, y: 0, w: 40, h: 20 }
    expect(labelFits('永康里', l, 11)).toBe(true)
    expect(labelFits('大龍峒保安里', l, 11)).toBe(false)
    expect(labelFits('永康里', { ...l, h: 10 }, 11)).toBe(false)
    expect(labelFits('永康里', null, 11)).toBe(false)
  })

  it('projects every real 大安 village into the canvas', () => {
    const dv = read('villages/DA.json')
    const proj = fitProjection(unionBBox(dv.villages.map((v: Village) => v.bbox))!)
    for (const v of dv.villages as Village[]) {
      const l = villageLabel(v, proj)!
      expect(l.x).toBeGreaterThan(0)
      expect(l.x).toBeLessThan(proj.width)
      expect(l.y).toBeGreaterThan(0)
      expect(l.y).toBeLessThan(proj.height)
    }
  })
})

describe('village trees and route candidates', () => {
  const ck = (treeId: string, result: Checkin['result'] = 'success'): Checkin => ({ treeId, result, at: 1 })

  it('lit ids: per prefix, success or farView, whole-id match', () => {
    const set = litTreeIds([ck('DA0030211045'), ck('DA0030211045-001'), ck('DA1', 'farView'), ck('NH001'), ck('DA2', 'success')], 'DA')
    expect([...set].sort()).toEqual(['DA0030211045', 'DA0030211045-001', 'DA1', 'DA2'])
  })

  it('parses tree files and rejects bad ones', () => {
    expect(parseTreePoints({ species: [], trees: { A: [121.5, 25.0, 1], B: ['x'] } })).toEqual([{ id: 'A', lngLat: [121.5, 25.0] }])
    expect(parseTreePoints(null)).toBeNull()
    expect(parseTreePoints({ trees: 3 })).toBeNull()
  })

  it('candidates are in the village, not lit, nearest first, capped', () => {
    const v: Village = {
      id: 'v',
      name: 'v',
      total: 4,
      bbox: [0, 0, 1, 1],
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    }
    const all = [
      { id: 'far', lngLat: [0.9, 0.9] as [number, number] },
      { id: 'near', lngLat: [0.11, 0.1] as [number, number] },
      { id: 'lit', lngLat: [0.1, 0.1] as [number, number] },
      { id: 'out', lngLat: [2, 2] as [number, number] },
      { id: 'mid', lngLat: [0.5, 0.5] as [number, number] },
    ]
    const c = routeCandidates(all, v, new Set(['lit']), [0.1, 0.1])
    expect(c.map((t) => t.id)).toEqual(['near', 'mid', 'far'])
    expect(routeCandidates(all, v, new Set(['lit']), [0.1, 0.1], 2).map((t) => t.id)).toEqual(['near', 'mid'])
  })

  it('real data: lit trees in DA are excluded and all candidates fall in the village', () => {
    const trees = parseTreePoints(read('trees/DA.json'))!
    const dv = read('villages/DA.json')
    const vill = (dv.villages as Village[]).find((v) => v.name === '永康里')!
    const lit = new Set(['DA0030211045'])
    const start = trees.find((t) => t.id === 'DA0030211045')!.lngLat
    const c = routeCandidates(trees, vill, lit, start, 60)
    expect(c.length).toBeGreaterThan(0)
    expect(c.length).toBeLessThanOrEqual(60)
    expect(c.some((t) => lit.has(t.id))).toBe(false)
  })

  it('summary text', () => {
    expect(tourSummary(1234, 16, 8)).toBe('約 1.2 公里・步行 16 分鐘・8 棵')
    expect(tourSummary(450, 0.2, 3)).toBe('約 450 公尺・步行 1 分鐘・3 棵')
  })

  it('prefix table is intact (district tiles use it)', () => {
    expect(Object.keys(PREFIX_DISTRICT)).toHaveLength(12)
  })
})

describe('isDoubleTap', () => {
  it('needs the same district within DOUBLE_TAP_MS', async () => {
    const { isDoubleTap, DOUBLE_TAP_MS } = await import('../tap')
    expect(isDoubleTap(null, '大安區', 1000)).toBe(false)
    expect(isDoubleTap({ name: '大安區', at: 1000 }, '大安區', 1000 + DOUBLE_TAP_MS)).toBe(true)
    expect(isDoubleTap({ name: '大安區', at: 1000 }, '大安區', 1001 + DOUBLE_TAP_MS)).toBe(false)
    expect(isDoubleTap({ name: '信義區', at: 1000 }, '大安區', 1100)).toBe(false)
  })
})
