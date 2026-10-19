import { useEffect, useState } from 'react'

/** public/data/species-photos/index.json 裡的一張照片（iNaturalist，只收 CC0 與 CC BY）。 */
export interface SpeciesPhoto {
  /** 相對於 data/species-photos/ 的路徑 */
  src: string
  /** 攝影者 */
  by: string
  /** 「© 名字, CC BY」或「CC0 名字」 */
  credit: string
  licence: 'CC0' | 'CC BY'
  licenceUrl: string
  /** iNaturalist 上的原始觀察 */
  link: string
}

export interface SpeciesPhotoIndex {
  attribution: string
  species: Record<string, SpeciesPhoto[]>
}

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** 檢查形狀；壞掉或授權不是 CC0 / CC BY 的項目直接丟掉，不顯示。 */
export function parseIndex(raw: unknown): SpeciesPhotoIndex {
  const out: SpeciesPhotoIndex = { attribution: '', species: {} }
  if (!raw || typeof raw !== 'object') return out
  const r = raw as { attribution?: unknown; species?: unknown }
  if (str(r.attribution)) out.attribution = r.attribution
  if (!r.species || typeof r.species !== 'object') return out
  for (const [name, list] of Object.entries(r.species as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const ok = (list as (Partial<SpeciesPhoto> | null)[]).filter(
      (p): p is SpeciesPhoto =>
        !!p &&
        str(p.src) &&
        str(p.by) &&
        str(p.credit) &&
        (p.licence === 'CC0' || p.licence === 'CC BY') &&
        str(p.licenceUrl) &&
        str(p.link),
    )
    if (ok.length) out.species[name] = ok
  }
  return out
}

let cache: Promise<SpeciesPhotoIndex> | null = null

/** 讀一次 index.json 就記住；讀不到就是沒有照片（畫面退回佔位圖）。 */
export function loadSpeciesPhotos(): Promise<SpeciesPhotoIndex> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/species-photos/index.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(parseIndex)
      .catch(() => parseIndex(null))
  }
  return cache
}

export function photoUrl(src: string): string {
  return `${import.meta.env.BASE_URL}data/species-photos/${src}`
}

/** 這個樹種的照片；還在讀或沒有就是空陣列。 */
export function useSpeciesPhotos(species: string | undefined): SpeciesPhoto[] {
  const [index, setIndex] = useState<SpeciesPhotoIndex | null>(null)
  useEffect(() => {
    let alive = true
    loadSpeciesPhotos().then((i) => alive && setIndex(i))
    return () => {
      alive = false
    }
  }, [])
  return (species && index?.species[species]) || []
}
