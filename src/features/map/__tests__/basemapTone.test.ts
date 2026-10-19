import { describe, expect, it, vi } from 'vitest'
import type { Map as MLMap } from 'maplibre-gl'
import { BUILDING_3D_PAINT, TONE, TONE_PAINT, firstLabelLayerId, toneBasemap } from '../basemapTone'

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** 假的 map：記下 setPaintProperty，layers 決定哪些圖層「存在」 */
function fakeMap(layers: string[], opts: { styleLoaded?: boolean; throws?: boolean } = {}) {
  const calls: [string, string, unknown][] = []
  let onLoad: (() => void) | undefined
  const map = {
    getLayer: (id: string) => (layers.includes(id) ? { id } : undefined),
    setPaintProperty: (id: string, prop: string, v: unknown) => {
      if (opts.throws) throw new Error('bad property')
      calls.push([id, prop, v])
    },
    setLight: vi.fn(),
    once: (_: string, cb: () => void) => {
      onLoad = cb
    },
  }
  return { map: map as unknown as MLMap, calls, fire: () => onLoad?.(), setLight: map.setLight, waiting: () => !!onLoad }
}

describe('底圖調色', () => {
  it('每個屬性的前綴和圖層種類相符（fill-／line-／text-／background-）', () => {
    const textLayers = /^(highway-name|label_|water_name|waterway_line_label)/
    const fillLayers = new Set(['park', 'landcover_wood', 'landuse_residential', 'water', 'building', 'road_area_pier'])
    for (const [id, paint] of Object.entries(TONE_PAINT)) {
      const prefix = id === 'background' ? 'background-' : textLayers.test(id) ? 'text-' : fillLayers.has(id) ? 'fill-' : 'line-'
      for (const prop of Object.keys(paint)) expect(prop.startsWith(prefix), `${id}: ${prop}`).toBe(true)
    }
  })

  it('所有顏色都是合法的色碼或 rgba()', () => {
    for (const paint of Object.values(TONE_PAINT))
      for (const [prop, v] of Object.entries(paint))
        if (prop.endsWith('color')) expect(String(v)).toMatch(/^(#[0-9a-f]{6}|rgba\([\d., ]+\))$/i)
  })

  it('街名與地名的字，對底圖紙色與描邊都 ≥ 4.5:1（街名要讀得清楚）', () => {
    for (const id of ['highway-name-path', 'highway-name-minor', 'highway-name-major', 'label_city', 'label_village', 'water_name_point_label']) {
      const paint = TONE_PAINT[id] as Record<string, string>
      expect(contrast(paint['text-color'], paint['text-halo-color']), `${id} vs halo`).toBeGreaterThanOrEqual(4.5)
      if (id.startsWith('highway-name') || id.startsWith('label_')) expect(contrast(paint['text-color'], TONE.paper), `${id} vs paper`).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(TONE.waterInk, TONE.water)).toBeGreaterThanOrEqual(4.5)
  })

  it('底色是暖色（紅 ≥ 綠 ≥ 藍），不是中性灰', () => {
    for (const c of [TONE.paper, TONE.building, TONE.building3d, TONE.road]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
      expect(r).toBeGreaterThanOrEqual(g)
      expect(g).toBeGreaterThan(b)
    }
    expect(BUILDING_3D_PAINT['fill-extrusion-color']).toBe(TONE.building3d)
  })

  it('樣式已經載入：馬上套用，只動存在的圖層', () => {
    const f = fakeMap(['background', 'building', 'highway-name-minor'])
    toneBasemap(f.map)
    expect(f.waiting()).toBe(false)
    expect(new Set(f.calls.map((c) => c[0]))).toEqual(new Set(['background', 'building', 'highway-name-minor']))
    expect(f.calls.find((c) => c[0] === 'background')).toEqual(['background', 'background-color', TONE.paper])
    expect(f.setLight).toHaveBeenCalledTimes(1)
  })

  it('樣式還沒載入：等 style.load 才套用', () => {
    const f = fakeMap([])
    toneBasemap(f.map)
    expect(f.calls).toHaveLength(0)
    expect(f.waiting()).toBe(true)
  })

  it('底圖樣式改版、屬性對不上時不丟錯', () => {
    const f = fakeMap(['background', 'building'], { throws: true })
    expect(() => toneBasemap(f.map)).not.toThrow()
  })

  it('firstLabelLayerId：第一個文字圖層', () => {
    const map = { getStyle: () => ({ layers: [{ id: 'bg', type: 'background' }, { id: 'road', type: 'line' }, { id: 'name', type: 'symbol' }, { id: 'p', type: 'symbol' }] }) } as unknown as MLMap
    expect(firstLabelLayerId(map)).toBe('name')
    const none = { getStyle: () => ({ layers: [{ id: 'bg', type: 'background' }] }) } as unknown as MLMap
    expect(firstLabelLayerId(none)).toBeUndefined()
  })
})
