import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MockTag, formatDate } from '../components/ui'
import players from '../mock/players.json'
import { dayKey } from '../lib/seed'
import {
  ACTION_LABEL,
  activeEvent,
  resetGameConfig,
  saveGameConfig,
  useGameConfig,
  type Action,
  type GameEvent,
} from '../features/game/config'
import { adjust, useBalance, useLedger } from '../features/game/ledger'
import { useInventory } from '../features/game/inventory'

const WEEK = 7 * 86_400_000

export default function GmPage() {
  const cfg = useGameConfig()
  return (
    <div className="console">
      <header className="gov-head">
        <div>
          <h1>遊戲營運後台（GM）</h1>
          <p className="muted small">示範：營運人員視角・不需登入・改動即時套用到市民端</p>
        </div>
        <nav className="row gap">
          <Link className="btn small" to="/">
            市民端
          </Link>
          <Link className="btn small" to="/more">
            更多後台
          </Link>
        </nav>
      </header>
      <Overview />
      <Rules />
      <Events />
      <Shop />
      <Support />
      <button
        className="btn small"
        onClick={() => {
          if (confirm('把規則、活動、商店都恢復預設？')) resetGameConfig()
        }}
      >
        恢復預設設定
      </button>
      <p className="muted small">目前活動：{activeEvent(cfg, dayKey())?.name ?? '無'}</p>
    </div>
  )
}

function Overview() {
  const ledger = useLedger()
  const inv = useInventory()
  const since = Date.now() - WEEK
  const week = ledger.filter((e) => e.at >= since)
  const issued = week.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0)
  const spent = week.filter((e) => e.delta < 0).reduce((n, e) => n - e.delta, 0)
  const funds = (inv.civic['fund-10'] ?? 0) + (inv.civic['water-bag'] ?? 0)
  return (
    <section>
      <h2>
        經濟概況 <MockTag title="全市數字為模擬；本機數字來自這台裝置" />
      </h2>
      <div className="stats">
        <div className="stat">
          全市本週發出
          <strong>{(48_260 + issued).toLocaleString()}</strong>
        </div>
        <div className="stat">
          全市本週回收
          <strong>{(31_905 + spent).toLocaleString()}</strong>
        </div>
        <div className="stat">
          捐給補種／認養
          <strong>{(1_284 + funds).toLocaleString()} 次</strong>
        </div>
        <div className="stat">
          本機本週 發出／回收
          <strong>
            {issued} / {spent}
          </strong>
        </div>
      </div>
    </section>
  )
}

function Rules() {
  const cfg = useGameConfig()
  return (
    <section>
      <h2>光點規則</h2>
      <table>
        <thead>
          <tr>
            <th>行為</th>
            <th>光點</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(ACTION_LABEL) as Action[]).map((a) => (
            <tr key={a}>
              <td>{ACTION_LABEL[a]}</td>
              <td>
                <input
                  className="input num-input"
                  type="number"
                  min={0}
                  max={100}
                  value={cfg.points[a]}
                  aria-label={`${ACTION_LABEL[a]}的光點`}
                  onChange={(e) =>
                    saveGameConfig({ points: { ...cfg.points, [a]: Math.max(0, Number(e.target.value) || 0) } })
                  }
                />
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>全域倍率</strong>
            </td>
            <td>
              <input
                className="input num-input"
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={cfg.multiplier}
                aria-label="全域倍率"
                onChange={(e) => saveGameConfig({ multiplier: Math.max(0, Number(e.target.value) || 0) })}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="muted small">同一棵樹每天只算一次；白天打卡另加日照加成。</p>
    </section>
  )
}

function Events() {
  const cfg = useGameConfig()
  const today = dayKey()
  const [draft, setDraft] = useState<Omit<GameEvent, 'id'>>({
    name: '',
    start: today,
    end: today,
    multiplier: 2,
  })
  const valid = draft.name.trim() && draft.start <= draft.end && draft.multiplier > 0
  return (
    <section>
      <h2>活動</h2>
      <table>
        <thead>
          <tr>
            <th>名稱</th>
            <th>期間</th>
            <th>倍率</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cfg.events.map((e) => (
            <tr key={e.id}>
              <td>
                {e.name}
                {e.start <= today && today <= e.end && <span className="new-tag">進行中</span>}
              </td>
              <td>
                {e.start} – {e.end}
              </td>
              <td>×{e.multiplier}</td>
              <td>
                <button
                  className="btn small"
                  onClick={() => saveGameConfig({ events: cfg.events.filter((x) => x.id !== e.id) })}
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        className="form-row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          saveGameConfig({ events: [...cfg.events, { ...draft, name: draft.name.trim(), id: `ev-${Date.now().toString(36)}` }] })
          setDraft({ ...draft, name: '' })
        }}
      >
        <label>
          名稱
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例如：秋分賞樹週" />
        </label>
        <label>
          開始
          <input className="input" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </label>
        <label>
          結束
          <input className="input" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </label>
        <label>
          倍率
          <input
            className="input num-input"
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={draft.multiplier}
            onChange={(e) => setDraft({ ...draft, multiplier: Number(e.target.value) })}
          />
        </label>
        <button className="btn primary" disabled={!valid}>
          新增活動
        </button>
      </form>
    </section>
  )
}

function Shop() {
  const cfg = useGameConfig()
  const set = (id: string, patch: { price?: number; active?: boolean }) =>
    saveGameConfig({ shop: cfg.shop.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  return (
    <section>
      <h2>商店</h2>
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>類別</th>
            <th>價格</th>
            <th>上架</th>
          </tr>
        </thead>
        <tbody>
          {cfg.shop.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{{ outfit: '造型', frame: '相框', civic: '回到城市' }[i.kind]}</td>
              <td>
                <input
                  className="input num-input"
                  type="number"
                  min={1}
                  value={i.price}
                  aria-label={`${i.name}的價格`}
                  onChange={(e) => set(i.id, { price: Math.max(1, Number(e.target.value) || 1) })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={i.active}
                  aria-label={`${i.name}上架`}
                  onChange={(e) => set(i.id, { active: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Support() {
  const balance = useBalance()
  const ledger = useLedger()
  const [q, setQ] = useState('')
  const [amount, setAmount] = useState(10)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const list = players.filter((p) => !q || p.id.includes(q.toUpperCase()) || p.nickname.includes(q))
  return (
    <section>
      <h2>
        玩家查詢與客服 <MockTag title="其他玩家為模擬；「這台裝置」是真的本機紀錄" />
      </h2>
      <input
        className="input"
        placeholder="搜尋玩家 ID 或暱稱"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="搜尋玩家"
      />
      <table style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>玩家</th>
            <th>光點</th>
            <th>打卡</th>
            <th>客訴／狀況</th>
            <th>建議處理</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              這台裝置 <span className="muted small">（你）</span>
            </td>
            <td>{balance}</td>
            <td>{ledger.filter((e) => e.key?.startsWith('checkin:') || e.key?.startsWith('farView:')).length}</td>
            <td className="small muted">最近一筆：{ledger.at(-1) ? `${ledger.at(-1)!.reason}（${formatDate(ledger.at(-1)!.at)}）` : '—'}</td>
            <td />
          </tr>
          {list.map((p) => (
            <tr key={p.id}>
              <td>
                {p.nickname} <span className="mono small muted">{p.id}</span>
              </td>
              <td>{p.balance}</td>
              <td>{p.checkins}</td>
              <td className="small">{p.ticket || '—'}</td>
              <td className="small muted">{p.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        className="form-row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!reason.trim() || !amount) return
          adjust(amount, `GM 補發：${reason.trim()}`)
          setDone(`已補發 ${amount} 光點給這台裝置。`)
          setReason('')
        }}
      >
        <label>
          補發光點（這台裝置）
          <input
            className="input num-input"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </label>
        <label style={{ flex: 1, minWidth: 200 }}>
          原因（必填，會出現在玩家的光點紀錄）
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如：GPS 漂移，補發打卡光點" />
        </label>
        <button className="btn primary" disabled={!reason.trim() || !amount}>
          補發
        </button>
      </form>
      {done && (
        <p className="muted small" role="status">
          {done}
        </p>
      )}
    </section>
  )
}
