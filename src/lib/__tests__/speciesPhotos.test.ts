import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSpeciesPhotos, parseIndex, photoUrl } from '../speciesPhotos'

const good = {
  src: 'ficus_microcarpa/1.jpg',
  by: 'Kiwi Shen',
  credit: '© Kiwi Shen, CC BY',
  licence: 'CC BY',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  link: 'https://www.inaturalist.org/observations/2',
}

describe('parseIndex', () => {
  it('keeps well-formed photos', () => {
    const i = parseIndex({ attribution: 'x', species: { 榕樹: [good] } })
    expect(i.attribution).toBe('x')
    expect(i.species['榕樹']).toEqual([good])
  })
  it('drops photos with another licence or missing fields, and empty species', () => {
    const i = parseIndex({
      species: {
        榕樹: [good, { ...good, licence: 'CC BY-NC' }, { ...good, credit: '' }, { ...good, link: undefined }, null],
        茄苳: [{ ...good, licence: 'CC BY-SA' }],
        樟樹: 'nope',
      },
    })
    expect(i.species['榕樹']).toHaveLength(1)
    expect(i.species['茄苳']).toBeUndefined()
    expect(i.species['樟樹']).toBeUndefined()
  })
  it('survives garbage', () => {
    expect(parseIndex(null).species).toEqual({})
    expect(parseIndex('x').species).toEqual({})
    expect(parseIndex({ species: 3 }).species).toEqual({})
  })
})

describe('real index.json (public/data/species-photos)', () => {
  const raw = JSON.parse(readFileSync('public/data/species-photos/index.json', 'utf8'))
  const idx = parseIndex(raw)
  it('nothing is dropped by the parser, every species has 4-6 photos, and the credit matches the licence', () => {
    const names = Object.keys(raw.species)
    expect(names.length).toBe(40)
    for (const n of names) {
      expect(idx.species[n]?.length, n).toBe(raw.species[n].length)
      expect(raw.species[n].length, n).toBeGreaterThanOrEqual(4)
      expect(raw.species[n].length, n).toBeLessThanOrEqual(6)
      for (const p of idx.species[n]) {
        expect(p.credit).toBe(p.licence === 'CC0' ? `CC0 ${p.by}` : `© ${p.by}, CC BY`)
      }
    }
  })
  it('covers the 40 commonest species of species.json', () => {
    const top = (JSON.parse(readFileSync('public/data/species.json', 'utf8')) as { species: string }[]).slice(0, 40).map((r) => r.species)
    expect(top.filter((n) => !idx.species[n])).toEqual([])
  })
})

describe('loadSpeciesPhotos', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('fetches once, caches, and builds the file url', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ attribution: 'a', species: { 榕樹: [good] } }) }))
    vi.stubGlobal('fetch', f)
    const a = await loadSpeciesPhotos()
    const b = await loadSpeciesPhotos()
    expect(a).toBe(b)
    expect(f).toHaveBeenCalledTimes(1)
    expect(String((f.mock.calls[0] as unknown[])[0])).toMatch(/data\/species-photos\/index\.json$/)
    expect(a.species['榕樹']).toHaveLength(1)
    expect(photoUrl('x/1.jpg')).toMatch(/data\/species-photos\/x\/1\.jpg$/)
  })
})
