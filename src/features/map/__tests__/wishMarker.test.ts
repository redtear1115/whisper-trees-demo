import { describe, expect, it } from 'vitest'
import { wishHitSize, wishMarkerLabel, wishMarkerSize } from '../wishMarker'

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
