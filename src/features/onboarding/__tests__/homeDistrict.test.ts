import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { TAIPEI_DISTRICTS } from '../../../store/types'
import { prefixAt } from '../../../lib/route'
import { PREFIX_DISTRICT } from '../../game/districts'
import { homeDistrict, onboarding, patchOnboarding } from '../../game/onboarding'
import { otherNote, resolveOtherDistrict, setHomeDistrict } from '../homeDistrict'

const sync = async (p: [number, number]) => prefixAt(p)

describe('resolveOtherDistrict (其他（不在台北市）)', () => {
  it('uses the district at the position when it is inside Taipei', async () => {
    const r = await resolveOtherDistrict([121.55, 25.025], () => 0.99, sync)
    expect(r).toEqual({ district: '大安區', how: 'position' })
    expect((await resolveOtherDistrict([121.59, 25.15], () => 0, sync)).district).toBe(PREFIX_DISTRICT.SL)
  })
  it('picks a random one of the 12 (injected rng) when the position is outside Taipei', async () => {
    const r = await resolveOtherDistrict([121.5, 25.0], () => 0, sync) // 新店
    expect(r).toEqual({ district: TAIPEI_DISTRICTS[0], how: 'random' })
    expect((await resolveOtherDistrict([121.5, 25.0], () => 0.5, sync)).district).toBe(TAIPEI_DISTRICTS[6])
  })
  it('picks a random one when there is no position at all, never out of range', async () => {
    expect((await resolveOtherDistrict(null, () => 0.999999, sync)).district).toBe(TAIPEI_DISTRICTS[11])
    expect((await resolveOtherDistrict(null, () => 1, sync)).district).toBe(TAIPEI_DISTRICTS[11])
    for (let i = 0; i < 12; i++) {
      const r = await resolveOtherDistrict(null, () => i / 12, sync)
      expect(r.how).toBe('random')
      expect(r.district).toBe(TAIPEI_DISTRICTS[i])
    }
  })
  it('says what happened, gently', () => {
    expect(otherNote({ district: '大安區', how: 'random' })).toBe('先從大安區開始吧，之後可以在「我的」改。')
    expect(otherNote({ district: '士林區', how: 'position' })).toContain('士林區')
  })
})

describe('home district persistence', () => {
  beforeEach(() => resetAll())
  it('has no district until one is set', () => {
    expect(homeDistrict()).toBeUndefined()
  })
  it('setHomeDistrict stores the exact Chinese name next to the other onboarding fields', () => {
    patchOnboarding({ tourStep: 1 })
    setHomeDistrict('大安區')
    expect(homeDistrict()).toBe('大安區')
    expect(onboarding()).toMatchObject({ tourStep: 1, homeDistrict: '大安區', homeDistrictChoice: 'pick' })
  })
  it('every picker value is a PREFIX_DISTRICT name', () => {
    expect([...TAIPEI_DISTRICTS].sort()).toEqual(Object.values(PREFIX_DISTRICT).sort())
  })
  it('ignores a stored value that is not one of the 12 districts', () => {
    patchOnboarding({ homeDistrict: '新店區' })
    expect(homeDistrict()).toBeUndefined()
  })
  it('later patches (animal, tour step) keep the district', () => {
    patchOnboarding({ homeDistrict: '信義區', homeDistrictChoice: 'other' })
    patchOnboarding({ animal: 'squirrel', tourStep: 1 })
    expect(onboarding()).toMatchObject({ homeDistrict: '信義區', homeDistrictChoice: 'other', animal: 'squirrel' })
  })
})
