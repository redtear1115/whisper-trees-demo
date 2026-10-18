import { getExt, setExt, useStore, type State } from '../../store'
import { spend } from './ledger'
import type { ShopItem } from './config'

export interface Inventory {
  /** 買過的造型與相框 */
  owned: string[]
  equipped: { outfit?: string; frame?: string }
  /** 「回到城市」類商品的累計次數 */
  civic: Record<string, number>
}

const EMPTY: Inventory = { owned: [], equipped: {}, civic: {} }

export function inventory(s?: State): Inventory {
  return getExt<Inventory>('inventory', EMPTY, s)
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
