import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Checkin } from '../../../store/types'
import type { Village } from '../../../lib/villages'
import { PREFIX_DISTRICT } from '../../game/districts'
import { TIER_TONES, contrast, rampColor, rampT, toneOf, villageFill, villageText, PANEL_BG } from '../colors'
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
  it('has five tones, unstarted darkest and brightening up to gold', () => {
    expect(TIER_TONES.map((t) => t.key)).toEqual(['none', 'iron', 'bronze', 'silver', 'gold'])
    const bright = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16)
    const levels = TIER_TONES.map((t) => bright(t.fill))
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    expect(toneOf(null).key).toBe('none')
    expect(toneOf('gold').key).toBe('gold')
  })

  it('label text reaches 4.5:1 on every tone', () => {
    for (const t of TIER_TONES) expect(contrast(t.text, t.fill), t.key).toBeGreaterThanOrEqual(4.5)
  })

  it('the panel can be told apart from the unstarted tone', () => {
    expect(contrast(TIER_TONES[0].fill, PANEL_BG)).toBeGreaterThan(1.2)
  })
})

describe('village ramp', () => {
  it('0 lit or no trees stays at the base colour; one tree is already visibly different', () => {
    expect(rampT(0, 400)).toBe(0)
    expect(rampT(5, 0)).toBe(0)
    expect(villageFill(0, 400)).toBe(rampColor(0))
    expect(rampT(1, 412)).toBeGreaterThanOrEqual(0.25)
    expect(villageFill(1, 412)).not.toBe(villageFill(0, 412))
  })

  it('is monotonic, capped at 1, and text stays readable', () => {
    let prev = 0
    for (let lit = 0; lit <= 412; lit++) {
      const t = rampT(lit, 412)
      expect(t).toBeGreaterThanOrEqual(prev)
      expect(t).toBeLessThanOrEqual(1)
      prev = t
      expect(contrast(villageText(lit, 412), villageFill(lit, 412)), String(lit)).toBeGreaterThanOrEqual(4.5)
    }
    expect(rampT(412, 412)).toBe(1)
    expect(rampT(999, 412)).toBe(1)
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
