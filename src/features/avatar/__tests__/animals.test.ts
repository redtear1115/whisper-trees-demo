import { describe, expect, it } from 'vitest'
import { ASSETS } from '../../../assets'
import { resetAll } from '../../../store'
import { onboarding } from '../../game/onboarding'
import { setAnimal } from '../useAnimal'
import { ANIMAL_IDS, ANIMALS, DEFAULT_ANIMAL, animalOf } from '../animals'

describe('animals', () => {
  it('has the four animals, 穿山甲 first and the default (team deck v17); 夜鷺 keeps the night-heron id', () => {
    expect(ANIMAL_IDS).toEqual(['pangolin', 'blue-magpie', 'night-heron', 'squirrel'])
    expect(ANIMALS.map((a) => a.name)).toEqual(['穿山甲', '臺灣藍鵲', '夜鷺', '赤腹松鼠'])
    expect(ANIMALS.map((a) => a.id)).toEqual([...ANIMAL_IDS])
    expect(ANIMALS.find((a) => a.id === 'night-heron')?.art).toBe('avatar-night-heron')
    expect(DEFAULT_ANIMAL).toBe('pangolin')
  })
  it('falls back to 穿山甲 for nothing, unknown or tampered values', () => {
    expect(animalOf(undefined).id).toBe('pangolin')
    expect(animalOf('dragon').id).toBe('pangolin')
    expect(animalOf(42).id).toBe('pangolin')
    expect(animalOf('blue-magpie').name).toBe('臺灣藍鵲')
  })
  it('a user with no stored animal gets 穿山甲; picking one persists', () => {
    resetAll()
    expect(animalOf(onboarding().animal).id).toBe('pangolin')
    setAnimal('squirrel')
    expect(animalOf(onboarding().animal).id).toBe('squirrel')
  })
  it('the 4 asset briefs carry the shared leaf and dot-eye note', () => {
    for (const a of ANIMALS) {
      const brief = ASSETS.find((x) => x.id === a.art)?.brief ?? ''
      expect(brief).toContain('同一片發光葉子')
      expect(brief).toContain('點狀眼睛')
    }
  })
  it('every animal has a placeholder asset in src/assets.ts', () => {
    for (const a of ANIMALS) expect(ASSETS.some((x) => x.id === a.art)).toBe(true)
  })
})
