import type { Wish } from '../../store/types'

/**
 * 許願建立時一定有一筆「已收件」，所以沒看過這台裝置的紀錄時以 1 為基準。
 * 這樣換手機登入後，只要政府曾新增處理進度，也會顯示通知。
 */
export function hasUnseenWishUpdate(wish: Pick<Wish, 'history'>, seenCount?: number): boolean {
  return (seenCount ?? 1) < wish.history.length
}

export function unseenWishUpdateCount(
  wishes: readonly Wish[],
  myWishIds: readonly string[],
  seen: Readonly<Record<string, number>>,
): number {
  const mine = new Set(myWishIds)
  return wishes.filter((wish) => mine.has(wish.id) && hasUnseenWishUpdate(wish, seen[wish.id])).length
}
