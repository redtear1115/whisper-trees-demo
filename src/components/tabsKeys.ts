/**
 * 分頁（role="tablist"）的鍵盤操作，WAI-ARIA 慣例：左右鍵移到前一個／下一個（上下鍵不攔截，頁面照常捲動）（頭尾相接）、
 * Home／End 跳到第一個／最後一個。回傳要移到的索引；不是分頁鍵就回傳 null（不攔截）。
 * 切換即啟用（selection follows focus），所以移到哪個、就選哪個。
 */
export function tabKeyTarget(key: string, index: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count
    case 'ArrowLeft':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
