// 里地圖與路線用的樹：某區的全部樹（id 與座標，來自 public/data/trees/<前綴>.json）、哪些已點亮、路線的候選樹。
// 這些檔案與 src/lib/trees.ts 的 findTree 讀的是同一份；那邊的快取沒有匯出，這裡另外載入（瀏覽器的 HTTP 快取會共用）。

import type { Checkin } from '../../store/types'
import { treePrefix } from '../../lib/treeId'
import { distanceMeters, type LngLat } from '../../lib/geo'
import { inVillage, type Village } from '../../lib/villages'

export interface TreePoint {
  id: string
  lngLat: LngLat
}

const cache = new Map<string, Promise<TreePoint[] | null>>()

/** 載入某區（前綴如 'DA'）的所有樹；失敗回傳 null、不重試。 */
export function loadTreePoints(prefix: string): Promise<TreePoint[] | null> {
  if (!/^[A-Z]{2}$/.test(prefix)) return Promise.resolve(null)
  let p = cache.get(prefix)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/trees/${prefix}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(parseTreePoints)
      .catch(() => null)
    cache.set(prefix, p)
  }
  return p
}

/** 取出 id 與座標；格式不對回傳 null */
export function parseTreePoints(raw: unknown): TreePoint[] | null {
  if (!raw || typeof raw !== 'object') return null
  const trees = (raw as { trees?: unknown }).trees
  if (!trees || typeof trees !== 'object') return null
  const out: TreePoint[] = []
  for (const [id, row] of Object.entries(trees as Record<string, unknown>)) {
    if (Array.isArray(row) && typeof row[0] === 'number' && typeof row[1] === 'number') out.push({ id, lngLat: [row[0], row[1]] })
  }
  return out
}

/** 某區打卡過的不同的樹（成功或遠觀，與集章同一個算法）；用整串 TreeID 比對 */
export function litTreeIds(checkins: readonly Checkin[], prefix: string): Set<string> {
  const out = new Set<string>()
  for (const c of checkins) {
    if ((c.result === 'success' || c.result === 'farView') && treePrefix(c.treeId) === prefix) out.add(c.treeId)
  }
  return out
}

/** 已點亮的樹（含座標）；資料裡查不到座標的略過 */
export function litTreePoints(all: readonly TreePoint[], lit: ReadonlySet<string>): TreePoint[] {
  return all.filter((t) => lit.has(t.id))
}

/**
 * 路線的候選樹：在這個里裡、還沒點亮，依離起點的直線距離由近到遠取前 limit 棵
 * （路線規劃只需要附近的，不必把整個里的幾千棵丟給它）。
 */
export function routeCandidates(
  all: readonly TreePoint[],
  village: Village,
  lit: ReadonlySet<string>,
  start: LngLat,
  limit = 60,
): TreePoint[] {
  return all
    .filter((t) => !lit.has(t.id) && inVillage(t.lngLat, village))
    .map((t) => ({ t, d: distanceMeters(start, t.lngLat) }))
    .sort((a, b) => a.d - b.d || (a.t.id < b.t.id ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.t)
}

/** 「1.2 公里」「340 公尺」：不到 1 公里用公尺（四捨五入到 10） */
export function distanceLabel(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} 公里` : `${Math.round(meters / 10) * 10} 公尺`
}

/** 「約 1.2 公里・步行 16 分鐘・8 棵」；不到 1 公里用公尺 */
export function tourSummary(meters: number, minutes: number, trees: number): string {
  return `約 ${distanceLabel(meters)}・步行 ${Math.max(1, Math.round(minutes))} 分鐘・${trees} 棵`
}
