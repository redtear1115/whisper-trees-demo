import { useEffect } from 'react'
import { IconBack } from '../components/icons'
import { Link } from 'react-router-dom'
import { markSeen, useStore, useWishes } from '../store'
import { WishCard } from '../features/wish/WishCard'
import { Card } from '../components/ui'
import type { Wish } from '../store/types'

export default function MyWishesPage() {
  const wishes = useWishes()
  const myIds = useStore((s) => s.myWishIds)
  const watered = useStore((s) => s.watered)
  const seen = useStore((s) => s.seen)
  const mine = wishes.filter((w) => myIds.includes(w.id))
  const wateredOnly = wishes.filter((w) => !myIds.includes(w.id) && watered[w.id])

  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/">
          <IconBack /> 地圖
        </Link>
        <span className="topbar-title">我的許願</span>
      </header>
      <Section title="我許的願" list={mine} seen={seen} empty="還沒有許願。在地圖上點空樹穴（空心圓）就可以許願。" />
      <Section title="我澆過水的願" list={wateredOnly} seen={seen} empty="還沒有幫別人的願望澆過水。" />
    </div>
  )
}

function Section({
  title,
  list,
  seen,
  empty,
}: {
  title: string
  list: Wish[]
  seen: Record<string, number>
  empty: string
}) {
  return (
    <>
      <h2 className="section-title">{title}</h2>
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
    </Card>
  )
}
