/** 許願小樹苗：畫面大小對應澆水數（22–44 px） */
export function wishMarkerSize(water: number): number {
  return Math.min(44, 22 + Math.sqrt(Math.max(0, water)) * 2.5)
}

/** 觸控最小可點範圍 */
export const MIN_HIT_PX = 44

/** 可點範圍：至少 44 px，圖案再大就跟著大；圖案本身的大小不變 */
export function wishHitSize(visual: number): number {
  return Math.max(MIN_HIT_PX, Math.ceil(visual))
}

/** 無障礙名稱：路名和「的許願」之間不留空格 */
export function wishMarkerLabel(road: string): string {
  return `${road.trim()}的許願`
}
