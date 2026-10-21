import { describe, expect, it } from 'vitest'
import { wishHitSize, wishMarkerLabel, wishMarkerSize, wishWaterLabel, wishWaterMark } from '../wishMarker'

describe('許願標記', () => {
  it('圖案大小 22–44 px，隨澆水數增加', () => {
    expect(wishMarkerSize(0)).toBe(22)
    expect(wishMarkerSize(-3)).toBe(22)
    expect(wishMarkerSize(9)).toBeCloseTo(29.5)
    expect(wishMarkerSize(10000)).toBe(44)
  })
  it('可點範圍永遠至少 44 px，不論圖案多小', () => {
    for (const v of [0, 22, 36, 41.2, 43.9, 44]) expect(wishHitSize(v)).toBeGreaterThanOrEqual(44)
    expect(wishHitSize(22)).toBe(44)
  })
  it('無障礙名稱沒有多餘空格', () => {
    expect(wishMarkerLabel('信義路二段')).toBe('信義路二段的許願')
    expect(wishMarkerLabel(' 信義路二段 ')).toBe('信義路二段的許願')
  })
})

describe('今天澆水的狀態（水滴／勾）', () => {
  it('許願中：今天沒澆是水滴，澆過是勾；已種植、不可種不標', () => {
    expect(wishWaterMark(true, false)).toBe('can')
    expect(wishWaterMark(true, true)).toBe('done')
    expect(wishWaterMark(false, false)).toBeNull()
    expect(wishWaterMark(false, true)).toBeNull()
  })
  it('無障礙名稱念出今天能不能澆', () => {
    expect(wishWaterLabel('can')).toContain('今天還能澆水')
    expect(wishWaterLabel('done')).toContain('今天澆過了')
    expect(wishWaterLabel(null)).toBe('')
  })
})
