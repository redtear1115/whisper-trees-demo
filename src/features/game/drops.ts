// 打卡的小驚喜（2026-10-20，對齊簡報 v17 第 14、19、20 頁）。規則見 docs/specs/08-extensions.md §1。
//   ① 稀有配件：第一次在受保護樹木打卡成功，掉落「古木紋理頭飾」，每個使用者一次（不是每棵樹一次）。
//   ② 樹上住戶（昆蟲彩蛋，模擬）：打卡成功時有一小段機率跳出瓢蟲、獨角仙或蟬，加幾點光點，記進圖鑑。
// 機率由「樹籍編號＋日期＋uid」當種子固定算出，重新整理不會重抽；GM 在 /gm 調機率與額外光點。

import { getAuthSnap } from '../../lib/firebase'
import { dayKey, hashString } from '../../lib/seed'
import { setExt } from '../../store'
import { gameConfig } from './config'
import { inventory, type Inventory } from './inventory'
import { awardInsect } from './ledger'
import { isProtectedTree } from './protectedTrees'

export const ANCIENT_HAT = 'hat-ancient'

export interface InsectDef {
  id: string
  name: string
  /** 佔位美術 ID，見 src/assets.ts */
  art: string
  /** 出現時的一句話 */
  line: string
  /** 只在這幾個月（台北日曆月，含頭尾）出現；沒寫就全年 */
  months?: [number, number]
}

export const INSECTS: InsectDef[] = [
  { id: 'ladybug', name: '瓢蟲', art: 'insect-ladybug', line: '葉子上停著一隻瓢蟲' },
  { id: 'beetle', name: '獨角仙', art: 'insect-beetle', line: '樹上有一隻獨角仙探出頭' },
  { id: 'cicada', name: '蟬', art: 'insect-cicada', line: '樹幹上有一隻蟬，輕輕叫了一聲', months: [5, 9] },
]

export function insectById(id: string): InsectDef | undefined {
  return INSECTS.find((i) => i.id === id)
}

/** day 是 dayKey() 的 YYYY-MM-DD */
export function inSeason(i: InsectDef, day: string): boolean {
  if (!i.months) return true
  const m = Number(day.slice(5, 7))
  return m >= i.months[0] && m <= i.months[1]
}

/**
 * 這棵樹這一天、這個使用者，會不會跳出樹上住戶、是哪一隻。純函式：同樣的輸入永遠同樣的結果。
 * chance ≤ 0 一定不出現，≥ 1 一定出現（蟬不在季節就從剩下的挑）。
 */
export function rollInsect(treeId: string, day: string, uid: string, chance: number): InsectDef | null {
  const seed = `${treeId}:${day}:${uid}`
  if (!((hashString(`insect:${seed}`) % 10_000) / 10_000 < chance)) return null
  const pool = INSECTS.filter((i) => inSeason(i, day))
  return pool.length ? pool[hashString(`which:${seed}`) % pool.length] : null
}

export interface CheckinDrops {
  /** 這次掉落了古木紋理頭飾 */
  hat?: boolean
  insect?: { id: string; name: string; art: string; line: string; bonus: number }
}

/** 第一次在受保護樹木打卡成功才給；已經有了、遠觀、不是受保護樹木都不給。回傳這次有沒有給。 */
export function grantAncientHat(treeId: string, kind: 'success' | 'farView'): boolean {
  if (kind !== 'success' || !isProtectedTree(treeId)) return false
  const inv = inventory()
  if (inv.owned.includes(ANCIENT_HAT)) return false
  setExt<Inventory>('inventory', { ...inv, owned: [...inv.owned, ANCIENT_HAT] })
  return true
}

/**
 * 打卡之後呼叫（名冊要先載入）。firstToday：這棵樹今天的第一次打卡成功（呼叫端在記下這次打卡「之前」算）。
 * 樹上住戶只在 firstToday 時抽，所以同一棵樹同一天重掃不會再出現，也不會重領光點。
 */
export function checkinDrops(
  treeId: string,
  kind: 'success' | 'farView',
  firstToday: boolean,
  now = new Date(),
): CheckinDrops {
  const out: CheckinDrops = {}
  if (grantAncientHat(treeId, kind)) out.hat = true
  if (kind === 'success' && firstToday) {
    const day = dayKey(now)
    const found = rollInsect(treeId, day, getAuthSnap().uid ?? 'local', gameConfig().insectChance)
    if (found) {
      const inv = inventory()
      if (!inv.insects?.[found.id])
        setExt<Inventory>('inventory', { ...inv, insects: { ...inv.insects, [found.id]: { treeId, at: now.getTime() } } })
      out.insect = { id: found.id, name: found.name, art: found.art, line: found.line, bonus: awardInsect(treeId, found.name, now) }
    }
  }
  return out
}
