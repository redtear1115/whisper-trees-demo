/** 由字串得到固定的 32 位元雜湊（FNV-1a） */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 以字串為種子的固定整數，落在 [min, max] */
export function seededInt(seed: string, min: number, max: number): number {
  return min + (hashString(seed) % (max - min + 1))
}

/** 本週的識別字串（週一起算），讓「本週」的模擬數字每週變一次 */
export function weekKey(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/**
 * 日期一律用台北時區（UTC+8，沒有夏令時間）的日曆日，格式 YYYY-MM-DD。
 * Firestore 規則用 request.time + 8 小時算同一天，這裡必須一致，澆水一天一次才不會兩邊算出不同的日子。
 */
export function dayKey(date = new Date()): string {
  return new Date(date.getTime() + 8 * 3_600_000).toISOString().slice(0, 10)
}
