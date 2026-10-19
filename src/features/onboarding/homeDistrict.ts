// 「我的區」：新手引導第 0 步與「我的」都用。純函式 + 一個會問位置的解析器，元件只負責畫。
// 寫進 onboarding.homeDistrict（中文區名，和 PREFIX_DISTRICT 一模一樣）；選了「其他（不在台北市）」時
// 用定位決定（人在台北市內 → 那一區），否則亂數挑一區並說出來。規格見 docs/specs/08-extensions.md §9。

import { TAIPEI_DISTRICTS } from '../../store/types'
import type { LngLat } from '../../lib/geo'
import { locate } from '../../lib/locate'
import { currentDemoPosition } from '../../lib/demoPosition'
import { prefixAtAsync } from '../../lib/route'
import { isDemoMode } from '../../store'
import { PREFIX_DISTRICT, type District } from '../game/districts'
import { patchOnboarding } from '../game/onboarding'

export interface OtherResult {
  district: District
  /** position = 你現在的位置在這一區；random = 沒有位置、或不在台北市，亂數挑的 */
  how: 'position' | 'random'
}

/**
 * 「其他（不在台北市）」要落在哪一區。
 * 有位置、而且在台北市內 → 位置所在的區；沒有位置或在市界外 → 從 12 區亂數挑一區（rng 可注入，測試用）。
 */
export async function resolveOtherDistrict(
  position: LngLat | null,
  rng: () => number = Math.random,
  prefixOf: (p: LngLat) => Promise<string | null> = prefixAtAsync,
): Promise<OtherResult> {
  if (position) {
    const prefix = await prefixOf(position)
    const district = prefix ? PREFIX_DISTRICT[prefix] : undefined
    if (district) return { district, how: 'position' }
  }
  const i = Math.min(TAIPEI_DISTRICTS.length - 1, Math.floor(rng() * TAIPEI_DISTRICTS.length))
  return { district: TAIPEI_DISTRICTS[i], how: 'random' }
}

/** 目前的位置：Demo 用模擬位置，其他用 GPS（使用者拒絕或逾時是 null） */
export async function currentLngLat(): Promise<LngLat | null> {
  if (isDemoMode()) return (await currentDemoPosition()).lngLat
  return (await locate())?.lngLat ?? null
}

/** 自己點選一區 */
export function setHomeDistrict(d: District) {
  patchOnboarding({ homeDistrict: d, homeDistrictChoice: 'pick' })
}

/** 選「其他」：問位置、決定區、存起來，回傳結果讓畫面說明 */
export async function chooseOtherDistrict(): Promise<OtherResult> {
  const result = await resolveOtherDistrict(await currentLngLat())
  patchOnboarding({ homeDistrict: result.district, homeDistrictChoice: 'other' })
  return result
}

/** 選完「其他」之後給使用者看的一句話 */
export function otherNote(r: OtherResult): string {
  return r.how === 'position'
    ? `你現在在${r.district}，就從這一區開始。之後可以在「我的」改。`
    : `先從${r.district}開始吧，之後可以在「我的」改。`
}
