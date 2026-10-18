import { treePrefix } from './treeId'
import type { LngLat } from './geo'

export interface Tree {
  id: string
  lngLat: LngLat
  species: string
  diameter: number | null
  height: number | null
  place: string
  remark: string
  kind: 'street' | 'park'
  surveyDate: string
  district: string
}

type Row = [number, number, number, number | null, number | null, string, string, 'street' | 'park', string, string]
interface LookupFile {
  species: string[]
  trees: Record<string, Row>
}

const cache = new Map<string, Promise<LookupFile | null>>()

function loadPrefix(prefix: string): Promise<LookupFile | null> {
  if (!/^[A-Z]{2}$/.test(prefix)) return Promise.resolve(null)
  let p = cache.get(prefix)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/trees/${prefix}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LookupFile>) : null))
      .catch(() => null)
    cache.set(prefix, p)
  }
  return p
}

/** 依樹籍編號查樹；資料裡沒有就回傳 null。 */
export async function findTree(id: string): Promise<Tree | null> {
  const file = await loadPrefix(treePrefix(id))
  const row = file?.trees[id]
  if (!file || !row) return null
  const [lon, lat, sp, diameter, height, place, remark, kind, surveyDate, district] = row
  return {
    id,
    lngLat: [lon, lat],
    species: file.species[sp] ?? '未知',
    diameter,
    height,
    place,
    remark: remark === '無' ? '' : remark,
    kind,
    surveyDate,
    district,
  }
}

export interface District {
  district: string
  street_trees: number
  all_trees: number
  sidewalk_km: number
  trees_per_km: number
  empty_pits: number
}

let districts: Promise<District[]> | null = null
export function loadDistricts(): Promise<District[]> {
  districts ??= fetch(`${import.meta.env.BASE_URL}data/districts.json`).then((r) => r.json())
  return districts
}
