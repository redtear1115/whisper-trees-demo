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

/**
 * 12 區的排列：由北往南，3 欄 4 列，每列是同一緯度帶、由西往東讀（依村里界的重心）。
 * 北投 士林 內湖／大同 中山 松山／萬華 中正 大安／文山 信義 南港。
 * 最後一列的南港在東北邊（緯度比文山、信義高），但放在右下角讀起來仍是「由西往東」。
 */
export const DISTRICTS_NORTH_TO_SOUTH: readonly District[] = [
  '北投區', '士林區', '內湖區',
  '大同區', '中山區', '松山區',
  '萬華區', '中正區', '大安區',
  '文山區', '信義區', '南港區',
]

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

export type HereResult =
  | { ok: true; district: District }
  | { ok: false; why: 'no-position' | 'outside' }

/**
 * 「用目前位置」：位置在台北市內 → 那一區；沒有位置（拒絕、逾時）→ no-position；在市界外 → outside。
 * 不亂數挑，失敗就請使用者自己點一區或選「其他」。
 */
export async function resolveHereDistrict(
  position: LngLat | null,
  prefixOf: (p: LngLat) => Promise<string | null> = prefixAtAsync,
): Promise<HereResult> {
  if (!position) return { ok: false, why: 'no-position' }
  const prefix = await prefixOf(position)
  const district = prefix ? PREFIX_DISTRICT[prefix] : undefined
  return district ? { ok: true, district } : { ok: false, why: 'outside' }
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

/** 按「用目前位置」：問位置、找到區就存起來，回傳結果讓畫面說明 */
export async function chooseHereDistrict(): Promise<HereResult> {
  const result = await resolveHereDistrict(await currentLngLat())
  if (result.ok) patchOnboarding({ homeDistrict: result.district, homeDistrictChoice: 'pick' })
  return result
}

/** 沒找到區時給使用者看的一句話：說原因，也說還可以怎麼選 */
export function hereNote(r: HereResult): string {
  if (r.ok) return `你現在在${r.district}。`
  return r.why === 'outside'
    ? '你現在不在台北市。直接點一區，或選「其他」。'
    : '沒有拿到你的位置。直接點一區，或選「其他」。'
}

/**
 * 選完「其他」之後給使用者看的一句話。說清楚是哪一區、做什麼用、哪裡可以改。
 * where = 'me'：人就在「我的」，不用再說「在我的換」。
 */
export function otherNote(r: OtherResult, where: 'tour' | 'me' = 'tour'): string {
  return where === 'me' ? `先從${r.district}開始集章。` : `先從${r.district}開始集章，之後可以在「我的」換。`
}
