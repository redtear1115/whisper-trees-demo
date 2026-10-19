import { useEffect, useState } from 'react'

// 受保護樹木（珍貴老樹）：打卡基礎光點 20。
//
// 名冊來自 public/data/protected-trees.json：臺北市受保護樹木（政府資料開放平台 dataset 121274）
// 依位置與樹種比對到公園處 TreeID，由 scripts/build_protected_trees.py 產生（方法見 08 §1）。
// 啟動時讀一次並記住；還沒讀到（或讀不到）時 isProtectedTree 一律回 false，光點照一般樹算。
// 要確保「剛開 App 就掃」也算進去，發光點之前先 await loadProtectedTrees()。

export interface ProtectedTreeEntry {
  treeId: string
  protectedNo: number
  species: string
  distanceM: number
  match: 'species' | 'near'
}

export interface ProtectedTreeList {
  attribution: string
  source: string
  trees: ProtectedTreeEntry[]
}

/** 只收格式完整的項目；整份壞掉就是空名單。TreeID 整串比對（含 -001 這類後綴）。 */
export function parseProtectedTrees(raw: unknown): ProtectedTreeList {
  const r = (raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(r.trees) ? r.trees : []
  const trees = list.filter(
    (t): t is ProtectedTreeEntry =>
      !!t && typeof t.treeId === 'string' && t.treeId !== '' && Number.isFinite(t.protectedNo) && typeof t.species === 'string',
  )
  return {
    attribution: typeof r.attribution === 'string' ? r.attribution : '',
    source: typeof r.source === 'string' ? r.source : '',
    trees,
  }
}

let byId: ReadonlyMap<string, ProtectedTreeEntry> | null = null
let pending: Promise<void> | null = null

export function loadProtectedTrees(): Promise<void> {
  if (byId) return Promise.resolve()
  pending ??= fetch(`${import.meta.env.BASE_URL}data/protected-trees.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      byId = new Map(parseProtectedTrees(j).trees.map((t) => [t.treeId, t]))
    })
    // 讀不到：這次當沒有名冊，下次呼叫再試一次
    .catch(() => {
      pending = null
    })
  return pending
}

/** 同步查詢：名冊讀到之前一律 false。 */
export function isProtectedTree(treeId: string): boolean {
  return byId?.has(treeId) ?? false
}

/** 測試用：直接放名冊，或清掉重來。 */
export function setProtectedTreesForTest(ids: Iterable<string> | null): void {
  pending = null
  byId = ids
    ? new Map([...ids].map((treeId) => [treeId, { treeId, protectedNo: 0, species: '', distanceM: 0, match: 'species' as const }]))
    : null
}

/** 畫面用：名冊讀到之後才會變成 true。 */
export function useIsProtectedTree(treeId: string): boolean {
  const [yes, setYes] = useState(() => isProtectedTree(treeId))
  useEffect(() => {
    let alive = true
    setYes(isProtectedTree(treeId))
    loadProtectedTrees().then(() => alive && setYes(isProtectedTree(treeId)))
    return () => {
      alive = false
    }
  }, [treeId])
  return yes
}
