import { useState } from 'react'
import { IconBack } from '../components/icons'
import { Link } from 'react-router-dom'
import { Art, MockTag } from '../components/ui'
import { useBalance } from '../features/game/ledger'
import { buy, useInventory, type BuyResult } from '../features/game/inventory'
import { useGameConfig, type ItemKind } from '../features/game/config'
import { EventBar } from '../features/game/EventBar'

// 「回到城市」放最前面：光點最有意義的去處
const KIND_TITLE: Record<ItemKind, string> = {
  civic: '回到城市',
  outfit: '小芽的造型',
  frame: '樹的頁面相框',
}

const RESULT_TEXT: Record<BuyResult, string> = {
  ok: '換到了。',
  owned: '已經有了。',
  poor: '光點不夠。',
  inactive: '這個商品已下架。',
}

export default function ShopPage() {
  const cfg = useGameConfig()
  const balance = useBalance()
  const inv = useInventory()
  const [msg, setMsg] = useState<string | null>(null)
  const items = cfg.shop.filter((i) => i.active)
  // 只在「最接近換得到」的那一個商品下面說還差多少，不在每個商品下面列欠額
  const nearest = items
    .filter((i) => i.price > balance && !(i.kind !== 'civic' && inv.owned.includes(i.id)))
    .sort((a, b) => a.price - b.price)[0]

  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/me">
          <IconBack /> 小芽
        </Link>
        <span className="topbar-title">商店</span>
        <MockTag />
      </header>
      <EventBar />
      <p className="balance-chip">
        <Art id="glow" alt="" className="icon sm" /> 你有 {balance} 光點
      </p>
      {msg && (
        <p className="banner" role="status">
          {msg}
        </p>
      )}
      {(Object.keys(KIND_TITLE) as ItemKind[]).map((kind) => {
        const list = items.filter((i) => i.kind === kind)
        if (!list.length) return null
        return (
          <section key={kind}>
            <h2 className="section-title">{KIND_TITLE[kind]}</h2>
            {kind === 'civic' && <p className="muted small">示意：目前不會真的捐款或認養。</p>}
            <div className="grid-cards">
              {list.map((item) => {
                const owned = item.kind !== 'civic' && inv.owned.includes(item.id)
                const times = inv.civic[item.id] ?? 0
                return (
                  <div key={item.id} className="tile">
                    <Art id={item.art} alt="" />
                    <strong>{item.name}</strong>
                    <span className="small muted">{item.brief}</span>
                    {times > 0 && <span className="small">已經做過 {times} 次，謝謝你</span>}
                    <button
                      className={`btn small ${balance >= item.price && !owned ? 'primary' : 'price'}`}
                      disabled={owned || balance < item.price}
                      onClick={() => setMsg(`${item.name}：${RESULT_TEXT[buy(item)]}`)}
                    >
                      {owned ? '已擁有' : `${item.price} 光點`}
                    </button>
                    {nearest?.id === item.id && (
                      <span className="small muted">再 {item.price - balance} 光點就能換</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
