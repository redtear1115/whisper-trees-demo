import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PREFIX_DISTRICT } from '../../features/game/districts'
import { parseOutline } from '../outline'

const FILE = 'public/data/taipei-outline.json'
const good = {
  attribution: 'x',
  viewBox: [100, 200],
  taipei: 'M0 0l1 1z',
  districts: { 中正區: 'M0 0l1 1z' },
  newtaipei: 'M0 0l1 1z',
  keelung: 'M0 0l1 1z',
}

describe('parseOutline', () => {
  it('accepts a well-formed file', () => {
    expect(parseOutline(good)?.viewBox).toEqual([100, 200])
  })
  it('rejects garbage and malformed files', () => {
    expect(parseOutline(null)).toBeNull()
    expect(parseOutline('x')).toBeNull()
    expect(parseOutline({ ...good, viewBox: [0, 5] })).toBeNull()
    expect(parseOutline({ ...good, viewBox: [1] })).toBeNull()
    expect(parseOutline({ ...good, taipei: '' })).toBeNull()
    expect(parseOutline({ ...good, keelung: undefined })).toBeNull()
    expect(parseOutline({ ...good, districts: {} })).toBeNull()
    expect(parseOutline({ ...good, districts: { 中正區: 5 } })).toBeNull()
  })
})

describe('public/data/taipei-outline.json', () => {
  const data = JSON.parse(readFileSync(FILE, 'utf8'))
  it('parses, with the 12 districts of districts.ts and the OSM attribution', () => {
    const o = parseOutline(data)
    expect(o).not.toBeNull()
    expect(new Set(Object.keys(o!.districts))).toEqual(new Set(Object.values(PREFIX_DISTRICT)))
    expect(o!.attribution).toContain('OpenStreetMap')
  })
  it('stays a light static backdrop (< 60 KB)', () => {
    expect(statSync(FILE).size).toBeLessThan(60_000)
  })
})
