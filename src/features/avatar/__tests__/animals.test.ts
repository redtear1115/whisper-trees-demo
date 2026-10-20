import { describe, expect, it } from 'vitest'
import { ASSETS } from '../../../assets'
import { resetAll } from '../../../store'
import { onboarding } from '../../game/onboarding'
import { setAnimal } from '../useAnimal'
import { ANIMAL_IDS, ANIMALS, DEFAULT_ANIMAL, animalOf } from '../animals'

describe('animals', () => {
  it('has the five animals from deck v20, 臺灣黑狗 first and the default', () => {
    expect(ANIMAL_IDS).toEqual(['taiwan-dog', 'leopard-cat', 'blue-magpie', 'malayan-night-heron', 'pangolin'])
    expect(ANIMALS.map((a) => a.name)).toEqual(['臺灣黑狗', '石虎', '臺灣藍鵲', '黑冠麻鷺', '穿山甲'])
    expect(ANIMALS.map((a) => a.id)).toEqual([...ANIMAL_IDS])
    expect(DEFAULT_ANIMAL).toBe('taiwan-dog')
    expect(ANIMALS.every((a) => a.blurb.length > 0 && a.blurb.length <= 20)).toBe(true)
  })
  it('falls back to 臺灣黑狗 for nothing, unknown or tampered values', () => {
    expect(animalOf(undefined).id).toBe('taiwan-dog')
    expect(animalOf('dragon').id).toBe('taiwan-dog')
    expect(animalOf(42).id).toBe('taiwan-dog')
    expect(animalOf('blue-magpie').name).toBe('臺灣藍鵲')
    expect(animalOf('pangolin').name).toBe('穿山甲')
  })
  it('resolves legacy stored values: night-heron to 黑冠麻鷺, squirrel to the default', () => {
    expect(animalOf('night-heron').id).toBe('malayan-night-heron')
    expect(animalOf('squirrel').id).toBe('taiwan-dog')
  })
  it('a user with no stored animal gets 臺灣黑狗; picking one persists', () => {
    resetAll()
    expect(animalOf(onboarding().animal).id).toBe('taiwan-dog')
    setAnimal('leopard-cat')
    expect(animalOf(onboarding().animal).id).toBe('leopard-cat')
  })
  it('the 5 asset briefs carry the shared leaf and dot-eye note', () => {
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
