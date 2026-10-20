// 「光點紀錄」每一列：哪一筆、為了哪棵樹或哪個願望。純函式，不碰 store。
// key 的格式見 features/game/districts.ts 的 parseLedgerKey：`${action}:${樹籍編號或許願 id}:${日期}`。

import type { Entry } from '../game/ledger'
import { parseLedgerKey } from '../game/districts'

export interface LedgerRow {
  at: number
  delta: number
  reason: string
  /** 打卡、遠觀、日照、樹洞：樹籍編號（連到 /tree/:id） */
  treeId?: string
  /** 許願、澆水：許願 id */
  wishId?: string
}

const WISH_ACTIONS = new Set(['wish', 'water'])

export function ledgerRow(e: Entry): LedgerRow {
  const row: LedgerRow = { at: e.at, delta: e.delta, reason: e.reason }
  const k = parseLedgerKey(e.key)
  if (!k) return row
  if (WISH_ACTIONS.has(k.action)) row.wishId = k.key
  else row.treeId = k.key
  return row
}

/** 最新的在前，最多 limit 筆；limit 省略就全部 */
export function newestRows(entries: readonly Entry[], limit?: number): LedgerRow[] {
  const rows = entries.map(ledgerRow).sort((a, b) => b.at - a.at)
  return limit === undefined ? rows : rows.slice(0, limit)
}

/** 「榕樹・忠孝東路四段」；查不到樹就 null（畫面只顯示原因） */
export function treeLabel(tree: { species: string; place: string } | null | undefined): string | null {
  if (!tree) return null
  return tree.place ? `${tree.species}・${tree.place}` : tree.species
}

/** 「忠孝東路四段的願望」；查不到就 null */
export function wishLabel(wish: { road: string } | null | undefined): string | null {
  return wish?.road ? `${wish.road}的願望` : null
}

/**
 * 光點紀錄給人看的原因：流水帳裡存的是規則（「寂寞樹 ×3（模擬）」「日照 ×1.4」），讀起來像規則引擎；
 * 畫面上改成一般人的話。不認得的片段（活動名稱、舊資料）原樣保留。模擬的標記（「（模擬）」）保留。
 */
export function plainReason(reason: string): string {
  return reason
    .split('・')
    .map((part) => {
      if (/^寂寞樹 ×\d+(\.\d+)?（模擬）$/.test(part)) return '好久沒人來的樹，多給一點（模擬）'
      if (/^日照 ×\d+(\.\d+)?$/.test(part)) return '白天的光比較足'
      if (/^受保護樹木 基礎 \d+$/.test(part)) return '受保護的老樹'
      if (/^同一棵樹第 \d+ 個互動$/.test(part)) return '同一棵樹旁又做了一件事'
      if (/^今天第 \d+ 棵起減半$/.test(part)) return '今天走了很多棵，光點減半'
      return part
    })
    .join('・')
}
