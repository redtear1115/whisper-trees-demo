import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { TAIPEI_DISTRICTS } from '../../../store/types'
import { prefixAt } from '../../../lib/route'
import { PREFIX_DISTRICT } from '../../game/districts'
import { homeDistrict, onboarding, patchOnboarding } from '../../game/onboarding'
import { DISTRICTS_NORTH_TO_SOUTH, hereNote, otherNote, resolveHereDistrict, resolveOtherDistrict, setHomeDistrict } from '../homeDistrict'

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
    expect(otherNote({ district: '大安區', how: 'random' })).toBe('先從大安區開始集章，之後可以在「我的」換。')
    expect(otherNote({ district: '士林區', how: 'position' })).toBe('先從士林區開始集章，之後可以在「我的」換。')
  })
  it('does not say 「在我的換」 when the user is already in 我的', () => {
    expect(otherNote({ district: '大安區', how: 'random' }, 'me')).toBe('先從大安區開始集章。')
  })
})

describe('geographic order of the 12 chips', () => {
  it('lists every district exactly once', () => {
    expect(DISTRICTS_NORTH_TO_SOUTH).toHaveLength(12)
    expect([...DISTRICTS_NORTH_TO_SOUTH].sort()).toEqual([...TAIPEI_DISTRICTS].sort())
  })
  it('runs north to south by band: 北投 first, 文山 and 信義 and 南港 in the last row', () => {
    expect(DISTRICTS_NORTH_TO_SOUTH[0]).toBe('北投區')
    expect(DISTRICTS_NORTH_TO_SOUTH.slice(0, 3)).toEqual(['北投區', '士林區', '內湖區'])
    expect(DISTRICTS_NORTH_TO_SOUTH.slice(9)).toEqual(['文山區', '信義區', '南港區'])
  })
  it('each row of 3 is a latitude band: the band centroids never go north again', () => {
    // 村里界重心緯度（public/data/villages，2026-10-20 量）；每列平均要由北往南
    const lat: Record<string, number> = {
      北投區: 25.129, 士林區: 25.104, 內湖區: 25.077, 大同區: 25.062, 中山區: 25.062, 松山區: 25.054,
      萬華區: 25.03, 中正區: 25.03, 大安區: 25.03, 文山區: 24.994, 信義區: 25.035, 南港區: 25.047,
    }
    const rows = [0, 3, 6, 9].map((i) => DISTRICTS_NORTH_TO_SOUTH.slice(i, i + 3).reduce((a, d) => a + lat[d], 0) / 3)
    expect([...rows].sort((a, b) => b - a)).toEqual(rows)
  })
})

describe('resolveHereDistrict (用目前位置)', () => {
  it('uses the district at the position inside Taipei', async () => {
    expect(await resolveHereDistrict([121.55, 25.025], sync)).toEqual({ ok: true, district: '大安區' })
    expect(await resolveHereDistrict([121.59, 25.15], sync)).toEqual({ ok: true, district: PREFIX_DISTRICT.SL })
  })
  it('never guesses: outside Taipei and no position are two different gentle failures', async () => {
    expect(await resolveHereDistrict([121.5, 25.0], sync)).toEqual({ ok: false, why: 'outside' }) // 新店
    expect(await resolveHereDistrict(null, sync)).toEqual({ ok: false, why: 'no-position' })
  })
  it('the failure notes say why and keep the other choices open', () => {
    expect(hereNote({ ok: false, why: 'outside' })).toBe('你現在不在台北市。直接點一區，或選「其他」。')
    expect(hereNote({ ok: false, why: 'no-position' })).toBe('沒有拿到你的位置。直接點一區，或選「其他」。')
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
