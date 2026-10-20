import { getExt, setExt, useStore, type State } from '../../store'
import { spend } from './ledger'
import { canonicalItemId, type ShopItem } from './config'
import type { Onboarding } from './onboarding'

/** 新手禮：完成「收集光點」後送的橡實帽（簡報 v20 前是草帽 hat-straw）。只靠 onboarding.giftAt 推算擁有，不寫進 ext.inventory。 */
export const STARTER_GIFT = 'hat-acorn'

export interface Inventory {
  /** 買過的造型與相框 */
  owned: string[]
  equipped: { outfit?: string; frame?: string }
  /** 舊版「回到城市」商品的累計次數。簡報 v20（2026-10-20）起商店不賣了，只讀不寫，舊資料原樣保留 */
  civic: Record<string, number>
  /** 樹上住戶（昆蟲彩蛋，模擬）第一次遇見：昆蟲 id → 哪棵樹、什麼時候。存在這裡是因為雲端的 users/{uid}.inventory 本來就是整個 map，不用動規則與寫入形狀。 */
  insects?: Record<string, { treeId: string; at: number }>
}

const EMPTY: Inventory = { owned: [], equipped: {}, civic: {} }

let memo: { raw: Inventory; gift: boolean; out: Inventory } | null = null

/** 舊造型 id 換成新的（去重），讓舊使用者保有原本的東西；沒有要換的就原樣回傳 */
function canonical(raw: Inventory): Inventory {
  const owned = [...new Set(raw.owned.map(canonicalItemId))]
  const o = raw.equipped.outfit
  const unchanged =
    owned.length === raw.owned.length && owned.every((id, i) => id === raw.owned[i]) && (!o || canonicalItemId(o) === o)
  if (unchanged) return raw
  return { ...raw, owned, equipped: { ...raw.equipped, ...(o ? { outfit: canonicalItemId(o) } : {}) } }
}

/**
 * 存下來的造型與相框（舊 id 換成新的），加上 onboarding.giftAt 推算出的新手禮。
 * useStore 需要穩定的參考，所以要記住結果。
 */
export function inventory(s?: State): Inventory {
  const raw = getExt<Inventory>('inventory', EMPTY, s)
  const gift = !!getExt<Onboarding>('onboarding', {}, s).giftAt
  if (memo?.raw !== raw || memo.gift !== gift) {
    const base = canonical(raw)
    memo = { raw, gift, out: gift && !base.owned.includes(STARTER_GIFT) ? { ...base, owned: [...base.owned, STARTER_GIFT] } : base }
  }
  return memo.out
}

export function useInventory() {
  return useStore((s) => inventory(s))
}

export type BuyResult = 'ok' | 'owned' | 'poor' | 'inactive'

export function buy(item: ShopItem): BuyResult {
  if (!item.active) return 'inactive'
  const inv = inventory()
  if (inv.owned.includes(item.id)) return 'owned'
  if (!spend(item.price, `商店：${item.name}`)) return 'poor'
  setExt('inventory', {
    ...inv,
    owned: [...inv.owned, item.id],
    equipped: { ...inv.equipped, [item.kind]: item.id },
  })
  return 'ok'
}

export function equip(kind: 'outfit' | 'frame', id: string | undefined) {
  const inv = inventory()
  if (id && !inv.owned.includes(id)) return
  setExt('inventory', { ...inv, equipped: { ...inv.equipped, [kind]: id } })
}
