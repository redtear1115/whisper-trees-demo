// 集章冊：依「打卡過幾棵不同的樹」按行政區算章，全部由 state.checkins 推算，不另外存。
// 光點歷史：依基礎流水帳（不含 GM 補發）的 key 歸到行政區。規格見 docs/specs/08-extensions.md §10。

import type { Checkin, Wish } from '../../store/types'
import { TAIPEI_DISTRICTS } from '../../store/types'
import { treePrefix } from '../../lib/treeId'
import { ACTION_LABEL, type Action } from './config'
import type { Entry } from './ledger'

export type District = (typeof TAIPEI_DISTRICTS)[number]

/**
 * 樹籍編號前兩碼 → 行政區。public/data/trees/<前綴>.json 一個檔案一個前綴，
 * 檔內樹的 Dist 欄位絕大多數同一區（少數幾棵邊界樹的 Dist 跟前綴不同，以前綴為準）。
 * __tests__/districts.test.ts 會讀 public/data/trees 驗證這張表。
 */
export const PREFIX_DISTRICT: Record<string, District> = {
  BT: '北投區',
  DA: '大安區',
  DT: '大同區',
  JJ: '中正區',
  JS: '中山區',
  NG: '南港區',
  NH: '內湖區',
  SL: '士林區',
  SS: '松山區',
  SY: '信義區',
  WH: '萬華區',
  WS: '文山區',
}

/** TreeID 取前兩碼（-001 之類的後綴不影響）；不認得的前綴回傳 null */
export function districtOfTreeId(treeId: string): District | null {
  return PREFIX_DISTRICT[treePrefix(treeId)] ?? null
}

export function shortName(d: District): string {
  return d.replace(/區$/, '')
}

// ---------- 章 ----------

export interface Tier {
  id: 'iron' | 'bronze' | 'silver' | 'gold'
  name: string
  /** 要打卡過幾棵不同的樹 */
  min: number
  art: string
}

export const TIERS: Tier[] = [
  { id: 'iron', name: '鐵章', min: 1, art: 'stamp-iron' },
  { id: 'bronze', name: '銅章', min: 10, art: 'stamp-bronze' },
  { id: 'silver', name: '銀章', min: 50, art: 'stamp-silver' },
  { id: 'gold', name: '金章', min: 200, art: 'stamp-gold' },
]

export interface EarnedStamp {
  district: District
  tier: Tier
  /** 打卡第 N 棵不同的樹的那一次打卡時間 */
  earnedAt: number
}

export interface DistrictStamps {
  district: District
  /** 打卡過幾棵不同的樹（成功或遠觀；同一棵只算一次） */
  distinct: number
  earned: EarnedStamp[]
  /** 目前最高的章；還沒開始是 null */
  top: Tier | null
  /** 下一枚章；金章之後是 null */
  next: Tier | null
}

/** 全部 12 區（固定順序 = TAIPEI_DISTRICTS）的集章進度 */
export function stampBook(checkins: readonly Checkin[]): DistrictStamps[] {
  // 每區：樹 → 第一次打卡時間
  const first = new Map<District, Map<string, number>>()
  for (const c of checkins) {
    if (c.result !== 'success' && c.result !== 'farView') continue
    const d = districtOfTreeId(c.treeId)
    if (!d) continue
    const m = first.get(d) ?? new Map<string, number>()
    const prev = m.get(c.treeId)
    if (prev === undefined || c.at < prev) m.set(c.treeId, c.at)
    first.set(d, m)
  }
  return TAIPEI_DISTRICTS.map((district) => {
    const times = [...(first.get(district)?.values() ?? [])].sort((a, b) => a - b)
    const distinct = times.length
    const earned: EarnedStamp[] = TIERS.filter((t) => distinct >= t.min).map((tier) => ({
      district,
      tier,
      earnedAt: times[tier.min - 1],
    }))
    return {
      district,
      distinct,
      earned,
      top: earned.length ? earned[earned.length - 1].tier : null,
      next: TIERS.find((t) => distinct < t.min) ?? null,
    }
  })
}

/** 全部已得到的章，最新的在前（同時間照行政區與章的順序，結果固定） */
export function earnedStampsNewestFirst(book: readonly DistrictStamps[]): EarnedStamp[] {
  const order = new Map<string, number>(TAIPEI_DISTRICTS.map((d, i) => [d, i]))
  return book
    .flatMap((b) => b.earned)
    .sort(
      (a, b) =>
        b.earnedAt - a.earnedAt ||
        order.get(a.district)! - order.get(b.district)! ||
        b.tier.min - a.tier.min,
    )
}

/** 「7／10，再 3 棵拿銅章」；金章之後「已集滿金章」 */
export function progressText(b: DistrictStamps): string {
  if (!b.next) return `${b.distinct} 棵，已集滿金章`
  const left = b.next.min - b.distinct
  return `${b.distinct}／${b.next.min}，再 ${left} 棵拿${b.next.name}`
}

// ---------- 光點歷史 ----------

export interface LedgerKey {
  action: Action
  /** 樹籍編號或許願 id */
  key: string
  day: string
}

/**
 * 解析 `${action}:${key}:${dayKey}`。action 取第一段、日期取最後一段、中間整段是 key
 * （樹籍編號與許願 id 目前都不含 ':'，但中間段允許含 ':'，不會切壞）。
 */
export function parseLedgerKey(fullKey: string | undefined): LedgerKey | null {
  if (!fullKey) return null
  const first = fullKey.indexOf(':')
  const last = fullKey.lastIndexOf(':')
  if (first <= 0 || last <= first) return null
  const action = fullKey.slice(0, first)
  const key = fullKey.slice(first + 1, last)
  const day = fullKey.slice(last + 1)
  if (!key || !day || !Object.prototype.hasOwnProperty.call(ACTION_LABEL, action)) return null
  return { action: action as Action, key, day }
}

export interface DistrictLight {
  at: number
  delta: number
  action: Action
  /** 樹籍編號；許願與澆水沒有 */
  treeId?: string
  /** 許願與澆水：許願所在的路名 */
  wishRoad?: string
}

export interface DistrictLedger {
  total: number
  items: DistrictLight[]
}

const WISH_ACTIONS: Action[] = ['wish', 'water']

/**
 * 把基礎流水帳歸到行政區（傳 baseLedger()，不是合併 GM 補發的 ledger()）。
 * 沒有 key 的（花費、GM 補發）與查不到行政區的樹或許願一律不算。items 最新的在前。
 */
export function lightByDistrict(
  entries: readonly Entry[],
  wishes: readonly Pick<Wish, 'id' | 'district' | 'road'>[],
): Map<District, DistrictLedger> {
  const wishById = new Map(wishes.map((w) => [w.id, w]))
  const out = new Map<District, DistrictLedger>()
  for (const e of entries) {
    const k = parseLedgerKey(e.key)
    if (!k) continue
    let district: District | null
    const item: DistrictLight = { at: e.at, delta: e.delta, action: k.action }
    if (WISH_ACTIONS.includes(k.action)) {
      const w = wishById.get(k.key)
      district = w && (TAIPEI_DISTRICTS as readonly string[]).includes(w.district) ? (w.district as District) : null
      item.wishRoad = w?.road
    } else {
      district = districtOfTreeId(k.key)
      item.treeId = k.key
    }
    if (!district) continue
    const d = out.get(district) ?? { total: 0, items: [] }
    d.total += e.delta
    d.items.push(item)
    out.set(district, d)
  }
  for (const d of out.values()) d.items.sort((a, b) => b.at - a.at)
  return out
}
