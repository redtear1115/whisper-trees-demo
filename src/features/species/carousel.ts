import type { SpeciesPhoto } from '../../lib/speciesPhotos'

/** 輪播的張數上下循環：-1 回到最後一張，n 回到第一張。 */
export function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0
  return ((i % n) + n) % n
}

/** 由捲動位置換算現在是第幾張（每張寬度 = 容器寬度，scroll-snap 會停在整數位置）。 */
export function indexFromScroll(scrollLeft: number, width: number, n: number): number {
  if (width <= 0 || n <= 0) return 0
  return Math.min(n - 1, Math.max(0, Math.round(scrollLeft / width)))
}

/** 圖片替代文字：「<樹種>，攝影：<name>」。 */
export function photoAlt(species: string, photo: Pick<SpeciesPhoto, 'by'>): string {
  return `${species}，攝影：${photo.by}`
}

/** 螢幕閱讀器用：第 n 張，共 N 張。 */
export function slideLabel(i: number, n: number): string {
  return `第 ${i + 1} 張，共 ${n} 張`
}
