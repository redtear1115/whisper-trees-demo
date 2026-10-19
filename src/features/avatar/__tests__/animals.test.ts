import { describe, expect, it } from 'vitest'
import { ASSETS } from '../../../assets'
import { ANIMAL_IDS, ANIMALS, DEFAULT_ANIMAL, animalOf } from '../animals'

describe('animals', () => {
  it('has the four animals, 臺灣藍鵲 first and the default', () => {
    expect(ANIMAL_IDS).toEqual(['blue-magpie', 'night-heron', 'squirrel', 'pangolin'])
    expect(ANIMALS.map((a) => a.name)).toEqual(['臺灣藍鵲', '黑冠麻鷺', '赤腹松鼠', '穿山甲'])
    expect(DEFAULT_ANIMAL).toBe('blue-magpie')
  })
  it('falls back to 臺灣藍鵲 for nothing, unknown or tampered values', () => {
    expect(animalOf(undefined).id).toBe('blue-magpie')
    expect(animalOf('dragon').id).toBe('blue-magpie')
    expect(animalOf(42).id).toBe('blue-magpie')
    expect(animalOf('pangolin').name).toBe('穿山甲')
  })
  it('every animal has a placeholder asset in src/assets.ts', () => {
    for (const a of ANIMALS) expect(ASSETS.some((x) => x.id === a.art)).toBe(true)
  })
})
