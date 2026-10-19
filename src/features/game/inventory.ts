import { getExt, setExt, useStore, type State } from '../../store'
import { spend } from './ledger'
import type { ShopItem } from './config'
import type { Onboarding } from './onboarding'

/** 新手禮：完成「收集光點」後送的草帽。只靠 onboarding.giftAt 推算擁有，不寫進 ext.inventory。 */
export const STARTER_GIFT = 'hat-straw'

export interface Inventory {
  /** 買過的造型與相框 */
  owned: string[]
  equipped: { outfit?: string; frame?: string }
  /** 「回到城市」類商品的累計次數 */
  civic: Record<string, number>
}

const EMPTY: Inventory = { owned: [], equipped: {}, civic: {} }

let memo: { raw: Inventory; out: Inventory } | null = null

/** 存下來的造型與相框，加上 onboarding.giftAt 推算出的新手禮（useStore 需要穩定的參考，所以要記住結果） */
export function inventory(s?: State): Inventory {
  const raw = getExt<Inventory>('inventory', EMPTY, s)
  if (!getExt<Onboarding>('onboarding', {}, s).giftAt || raw.owned.includes(STARTER_GIFT)) return raw
  if (memo?.raw !== raw) memo = { raw, out: { ...raw, owned: [...raw.owned, STARTER_GIFT] } }
  return memo.out
}

export function useInventory() {
  return useStore((s) => inventory(s))
}

export type BuyResult = 'ok' | 'owned' | 'poor' | 'inactive'

export function buy(item: ShopItem): BuyResult {
  if (!item.active) return 'inactive'
  const inv = inventory()
  if (item.kind !== 'civic' && inv.owned.includes(item.id)) return 'owned'
  if (!spend(item.price, `商店：${item.name}`)) return 'poor'
  const next: Inventory =
    item.kind === 'civic'
      ? { ...inv, civic: { ...inv.civic, [item.id]: (inv.civic[item.id] ?? 0) + 1 } }
      : {
          ...inv,
          owned: [...inv.owned, item.id],
          equipped: { ...inv.equipped, [item.kind]: item.id },
        }
  setExt('inventory', next)
  return 'ok'
}

export function equip(kind: 'outfit' | 'frame', id: string | undefined) {
  const inv = inventory()
  if (id && !inv.owned.includes(id)) return
  setExt('inventory', { ...inv, equipped: { ...inv.equipped, [kind]: id } })
}
