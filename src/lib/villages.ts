// 里（村里）界：每區一個檔案 public/data/villages/<前綴>.json，由 scripts/build_villages.py 從內政部國土測繪中心
// 村里界產生（含每里的樹木總數）。規格見 docs/specs/08-extensions.md §10「里（資料）」。

import type { LngLat } from './geo'

export type Ring = [number, number][]
export type VillageGeometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] }

export interface Village {
  /** VILLCODE，例如 '63000010001' */
  id: string
  name: string
  /** 里內全部樹木（真實開放資料）數量 */
  total: number
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number]
  geometry: VillageGeometry
}

export interface DistrictVillages {
  district: string
  attribution: string
  villages: Village[]
}

const cache = new Map<string, Promise<DistrictVillages | null>>()

/** 載入某區（樹籍編號前兩碼，如 'DA'）的里；失敗（404、網路、格式不對）回傳 null，且不重試。 */
export function loadVillages(prefix: string): Promise<DistrictVillages | null> {
  if (!/^[A-Z]{2}$/.test(prefix)) return Promise.resolve(null)
  let p = cache.get(prefix)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/villages/${prefix}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => (isDistrictVillages(raw) ? raw : null))
      .catch(() => null)
    cache.set(prefix, p)
  }
  return p
}

function isDistrictVillages(raw: unknown): raw is DistrictVillages {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return typeof o.district === 'string' && Array.isArray(o.villages)
}

/** 射線法：點是否在單一環內（邊上的點不保證結果，真實資料裡機率可忽略） */
function inRing([x, y]: LngLat, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 一個多邊形：在外環內、且不在任何洞內 */
function inPolygon(p: LngLat, rings: Ring[]): boolean {
  return rings.length > 0 && inRing(p, rings[0]) && !rings.slice(1).some((hole) => inRing(p, hole))
}

export function inVillage(p: LngLat, v: Village): boolean {
  const [minX, minY, maxX, maxY] = v.bbox
  if (p[0] < minX || p[0] > maxX || p[1] < minY || p[1] > maxY) return false
  const g = v.geometry
  return g.type === 'Polygon' ? inPolygon(p, g.coordinates) : g.coordinates.some((poly) => inPolygon(p, poly))
}

/** 座標落在哪一里；不在任何一里（河面、市界外）回傳 null。 */
export function villageOf(p: LngLat, villages: readonly Village[]): Village | null {
  return villages.find((v) => inVillage(p, v)) ?? null
}

/**
 * 每里「點亮」幾棵不同的樹：傳入打卡過的樹（含座標），同一個 id 只算一次。
 * 結果 Map 的 key 是里的 id；沒有樹的里不在 Map 裡。
 */
export function countLitByVillage(
  trees: readonly { id: string; lngLat: LngLat }[],
  villages: readonly Village[],
): Map<string, number> {
  const seen = new Set<string>()
  const out = new Map<string, number>()
  for (const t of trees) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    const v = villageOf(t.lngLat, villages)
    if (v) out.set(v.id, (out.get(v.id) ?? 0) + 1)
  }
  return out
}
