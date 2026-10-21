import type { Wish } from '../../store/types'

/**
 * 這台裝置沒有「看過」紀錄時的基準（fallback）：
 * - 自己許的願用 1：建立時一定有一筆「已收件」，之後每一筆都是政府的回應，換手機登入也會提示。
 * - 別人的願用 null：澆水當時看過幾筆只記在原本的裝置，猜不到，就不提示。
 */
export function hasUnseenWishUpdate(
  wish: Pick<Wish, 'history'>,
  seenCount: number | undefined,
  fallback: number | null = 1,
): boolean {
  const base = seenCount ?? fallback
  return base !== null && base < wish.history.length
}

export function unseenWishUpdateCount(
  wishes: readonly Wish[],
  myWishIds: readonly string[],
  seen: Readonly<Record<string, number>>,
): number {
  const mine = new Set(myWishIds)
  return wishes.filter((wish) => mine.has(wish.id) && hasUnseenWishUpdate(wish, seen[wish.id])).length
}
