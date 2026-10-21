import { useEffect, useMemo, useState } from 'react'
import { IconBack } from '../components/icons'
import { Link } from 'react-router-dom'
import { markSeen, useStore, useWishes } from '../store'
import { WishCard } from '../features/wish/WishCard'
import { Card, EmptyCard } from '../components/ui'
import type { Wish } from '../store/types'
import { NEAR } from '../config'
import { useAnchor } from '../features/map/useAnchor'
import { nearbyWishes } from '../features/wish/nearbyWishes'
import { formatDistance } from '../features/journal/nearby'
import { hasUnseenWishUpdate } from '../features/wish/updates'

/** 附近別人的願先列幾個，其餘按「看更多」 */
const NEARBY_WISH_FIRST = 3

/**
 * 許願分頁：/wishes 與 /journal 共用（不只自己的，附近別人的願也列出來，直接幫它澆水）。
 * 我許的願 → 附近別人的願（300 m 內，近到遠）→ 我澆過水、但不在附近的別人的願。
 */
export function MyWishes({ sub = false }: { sub?: boolean }) {
  const wishes = useWishes()
  const myIds = useStore((s) => s.myWishIds)
  const watered = useStore((s) => s.watered)
  const seen = useStore((s) => s.seen)
  const anchor = useAnchor(true)
  const located = anchor.source !== 'fallback'
  const [showAll, setShowAll] = useState(false)
  const mine = wishes.filter((w) => myIds.includes(w.id))
  const [lon, lat] = anchor.lngLat
  const nearby = useMemo(
    () => (located ? nearbyWishes(wishes, myIds, [lon, lat], NEAR.radiusMeters) : []),
    [located, wishes, myIds, lon, lat],
  )
  const nearIds = new Set(nearby.map((r) => r.wish.id))
  const wateredOnly = wishes.filter((w) => !myIds.includes(w.id) && watered[w.id] && !nearIds.has(w.id))
  const Title = sub ? 'h3' : 'h2'

  return (
    <div data-testid="my-wishes">
      {mine.length === 0 && wateredOnly.length === 0 && nearby.length === 0 ? (
        <EmptyCard
          art="wish-empty"
          title="還沒有願望"
          testId="wishes-empty"
          action={
            <Link className="btn primary" to="/" data-testid="wishes-empty-go">
              去地圖找空樹穴
            </Link>
          }
        >
          在地圖上點一個空樹穴（空心圓），或長按想種樹的地方，就能許一個願。
        </EmptyCard>
      ) : (
        <>
          <Section sub={sub} title="我許的願" list={mine} seen={seen} fallback={1} empty="還沒有許願。在地圖上點空樹穴（空心圓）就可以許願。" />
          <section data-testid="wishes-nearby">
            <Title className="section-title">附近別人的願</Title>
            <p className="muted small">你身邊 {NEAR.radiusMeters} 公尺內，別人許的願。一天可以幫每個願澆一次水。</p>
            {!located ? (
              <p className="muted">還沒有你的位置。打開定位，或用 Demo 模式。</p>
            ) : nearby.length === 0 ? (
              <p className="muted">附近還沒有別人許的願。</p>
            ) : (
              <>
                {(showAll ? nearby : nearby.slice(0, NEARBY_WISH_FIRST)).map(({ wish, distance }) => (
                  <SeenCard key={wish.id} wish={wish} changed={false} distance={distance} />
                ))}
                {!showAll && nearby.length > NEARBY_WISH_FIRST && (
                  <button className="btn block" data-testid="wishes-nearby-more" onClick={() => setShowAll(true)}>
                    看更多（還有 {nearby.length - NEARBY_WISH_FIRST} 個）
                  </button>
                )}
              </>
            )}
          </section>
          {wateredOnly.length > 0 && <Section sub={sub} title="我澆過水的別人的願" list={wateredOnly} seen={seen} fallback={null} empty="" />}
        </>
      )}
    </div>
  )
}

/** /wishes：舊連結仍可用，和樹洞頁的「許願」是同一份內容 */
export default function MyWishesPage() {
  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/journal">
          <IconBack /> 樹洞
        </Link>
        <h1 className="topbar-title">許願</h1>
      </header>
      <MyWishes />
    </div>
  )
}

function Section({
  sub,
  title,
  list,
  seen,
  fallback,
  empty,
}: {
  sub: boolean
  title: string
  list: Wish[]
  seen: Record<string, number>
  /** 這台裝置沒有看過紀錄時的基準，見 hasUnseenWishUpdate */
  fallback: number | null
  empty: string
}) {
  // 別人的願在這台裝置第一次出現：記下現在的筆數當基準，之後新增的進度才提示
  useEffect(() => {
    if (fallback !== null) return
    for (const w of list) if (seen[w.id] === undefined) markSeen(w.id)
  }, [fallback, list, seen])
  return (
    <>
      {sub ? <h3 className="section-title">{title}</h3> : <h2 className="section-title">{title}</h2>}
      {list.length === 0 && <p className="muted">{empty}</p>}
      {list.map((w) => (
        <SeenCard key={w.id} wish={w} changed={hasUnseenWishUpdate(w, seen[w.id], fallback)} />
      ))}
    </>
  )
}

function SeenCard({ wish, changed, distance }: { wish: Wish; changed: boolean; distance?: number }) {
  // 看過就清掉提示點；留一點時間讓人注意到
  useEffect(() => {
    if (!changed) return
    const t = setTimeout(() => markSeen(wish.id), 4000)
    return () => clearTimeout(t)
  }, [changed, wish.id, wish.history.length])
  return (
    <Card className={changed ? 'changed' : ''}>
      {changed && <p className="new-badge">進度更新了</p>}
      {distance !== undefined && (
        <p className="muted small wish-distance" data-testid="wish-distance">
          離你{formatDistance(distance)}
        </p>
      )}
      <WishCard wish={wish} compact={distance !== undefined} />
      <Link className="btn small map-link" to="/" state={{ focus: wish.lngLat, wishId: wish.id }}>
        在地圖上看
      </Link>
    </Card>
  )
}
