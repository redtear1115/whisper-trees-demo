import { useEffect } from 'react'
import { IconBack } from '../components/icons'
import { Link } from 'react-router-dom'
import { markSeen, useStore, useWishes } from '../store'
import { WishCard } from '../features/wish/WishCard'
import { Card, EmptyCard } from '../components/ui'
import type { Wish } from '../store/types'

/** 我的許願內容：/wishes 與 /journal 共用 */
export function MyWishes({ sub = false }: { sub?: boolean }) {
  const wishes = useWishes()
  const myIds = useStore((s) => s.myWishIds)
  const watered = useStore((s) => s.watered)
  const seen = useStore((s) => s.seen)
  const mine = wishes.filter((w) => myIds.includes(w.id))
  const wateredOnly = wishes.filter((w) => !myIds.includes(w.id) && watered[w.id])

  return (
    <div data-testid="my-wishes">
      {mine.length === 0 && wateredOnly.length === 0 ? (
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
          <Section sub={sub} title="我許的願" list={mine} seen={seen} empty="還沒有許願。在地圖上點空樹穴（空心圓）就可以許願。" />
          <Section sub={sub} title="我澆過水的別人的願" list={wateredOnly} seen={seen} empty="還沒有幫別人的願望澆過水。" />
        </>
      )}
    </div>
  )
}

/** /wishes：舊連結仍可用，和樹洞頁的「我的許願」是同一份內容 */
export default function MyWishesPage() {
  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/journal">
          <IconBack /> 樹洞
        </Link>
        <h1 className="topbar-title">我的許願</h1>
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
  empty,
}: {
  sub: boolean
  title: string
  list: Wish[]
  seen: Record<string, number>
  empty: string
}) {
  return (
    <>
      {sub ? <h3 className="section-title">{title}</h3> : <h2 className="section-title">{title}</h2>}
      {list.length === 0 && <p className="muted">{empty}</p>}
      {list.map((w) => (
        <SeenCard key={w.id} wish={w} changed={seen[w.id] !== undefined && seen[w.id] < w.history.length} />
      ))}
    </>
  )
}

function SeenCard({ wish, changed }: { wish: Wish; changed: boolean }) {
  // 看過就清掉提示點；留一點時間讓人注意到
  useEffect(() => {
    if (!changed) return
    const t = setTimeout(() => markSeen(wish.id), 4000)
    return () => clearTimeout(t)
  }, [changed, wish.id, wish.history.length])
  return (
    <Card className={changed ? 'changed' : ''}>
      {changed && <p className="new-badge">進度更新了</p>}
      <WishCard wish={wish} />
      <Link className="btn small map-link" to="/" state={{ focus: wish.lngLat, wishId: wish.id }}>
        在地圖上看
      </Link>
    </Card>
  )
}
