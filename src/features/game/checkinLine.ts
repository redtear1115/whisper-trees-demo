// 剛打卡完，樹的頁面「你在這棵樹旁邊。」下面那一行安靜的光點說明（2026-10-20 使用者決定，不彈動畫）。
// 純函式，不碰 store。只說收了幾道、必要時加一個原因；不列倍率（倍率寫在「我的」的光點紀錄）。

export interface CheckinLineInput {
  /** 這次打卡實際收到的光點；undefined = 不是剛打卡（重新整理、從地圖進來），不顯示 */
  glow: number | undefined
  kind: 'success' | 'farView'
  /** 這棵樹是受保護樹木 */
  protectedTree: boolean
}

/** 回傳 null 就不顯示。原因只挑一個最有意義的：受保護樹木 > 遠觀 */
export function checkinPointsLine({ glow, kind, protectedTree }: CheckinLineInput): string | null {
  if (glow === undefined) return null
  if (glow <= 0) return '今天在這棵樹旁的光點，已經收過了。'
  const tag = kind === 'success' && protectedTree ? '・受保護樹木' : kind === 'farView' ? '・遠觀' : ''
  return `收進 ${glow} 道光點${tag}`
}

/** 樹況回報送出後的那一句，和打卡的說法一致 */
export function reportPointsLine(glow: number): string {
  return glow > 0 ? `收進 ${glow} 道光點。` : ''
}
