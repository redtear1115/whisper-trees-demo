import { useState, type ReactNode } from 'react'
import { AdminNav } from '../components/AdminNav'
import { MockTag, formatDate } from '../components/ui'
import players from '../mock/players.json'
import { dayKey } from '../lib/seed'
import {
  ACTION_LABEL,
  activeEvent,
  resetGameConfig,
  saveGameConfig,
  useGameConfig,
  type GameEvent,
  type PointAction,
} from '../features/game/config'
import { adjust, useBalance, useLedger } from '../features/game/ledger'
import { useInventory } from '../features/game/inventory'
import { AdminMode } from '../features/cloud/AdminMode'

const WEEK = 7 * 86_400_000

export default function GmPage() {
  const cfg = useGameConfig()
  return (
    <div className="console">
      <header className="gov-head">
        <div>
          <h1>遊戲營運後台（GM）</h1>
          <AdminMode role="營運人員視角" />
        </div>
        <AdminNav />
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

/** 一格數字欄位：改了就存進 GM 設定 */
function NumRow({
  label,
  note,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: {
  label: string
  note?: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (n: number) => void
}) {
  return (
    <tr>
      <td>
        {label}
        {note && <span className="rule-note">{note}</span>}
      </td>
      <td>
        <input
          className="input num-input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        />
      </td>
    </tr>
  )
}

function Rules() {
  const cfg = useGameConfig()
  const setPoint = (a: PointAction, n: number) => saveGameConfig({ points: { ...cfg.points, [a]: n } })
  const table = (title: string, rows: ReactNode) => (
    <>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>項目</th>
            <th>數值</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  )
  return (
    <section className="gm-rules">
      <h2>光點規則</h2>
      <p className="muted small">依團隊簡報 v17「能量單位：光點」。這裡是示範用的模擬經濟，數值都可以調。</p>
      {table(
        '基礎點數',
        <>
          <NumRow label={`${ACTION_LABEL.checkin}（靠近一棵樹）`} value={cfg.points.checkin} onChange={(n) => setPoint('checkin', n)} />
          <NumRow label={ACTION_LABEL.farView} value={cfg.points.farView} onChange={(n) => setPoint('farView', n)} />
          <NumRow label={`${ACTION_LABEL.report}（不含社區複驗的 +5）`} value={cfg.points.report} onChange={(n) => setPoint('report', n)} />
          <NumRow label={ACTION_LABEL.wish} value={cfg.points.wish} onChange={(n) => setPoint('wish', n)} />
          <NumRow label="見縫插樹澆水支持（每人每天 1 次）" value={cfg.points.water} onChange={(n) => setPoint('water', n)} />
        </>,
      )}
      {table(
        '同一棵樹的後續互動',
        <>
          <NumRow
            label="第 2 個互動"
            note="打卡、遠觀、樹洞、樹況回報各算一個；樹況回報固定發基礎點數，只佔一格"
            value={cfg.ladder2}
            onChange={(n) => saveGameConfig({ ladder2: n })}
          />
          <NumRow label="第 3 個互動" note="第 4 個起不再發光點" value={cfg.ladder3} onChange={(n) => saveGameConfig({ ladder3: n })} />
          <NumRow
            label="每天第幾棵樹起，打卡光點減半"
            note="一天裡不同的樹，從這一棵起打卡光點 ×0.5，避免整天專門刷"
            value={cfg.halveFrom}
            min={1}
            onChange={(n) => saveGameConfig({ halveFrom: n })}
          />
        </>,
      )}
      {table(
        '倍率',
        <>
          <NumRow
            label="日照加成最高倍率"
            note="日出日落 ×1、正午前後最高；夜間 ×1。乘在打卡與同棵樹的互動上"
            value={cfg.sunMax}
            min={1}
            max={3}
            step={0.1}
            onChange={(n) => saveGameConfig({ sunMax: n })}
          />
          <NumRow
            label="寂寞樹：幾天沒人拜訪"
            note="上次拜訪是模擬資料（依樹籍編號固定產生），自己更近的拜訪優先"
            value={cfg.lonelyDays}
            min={1}
            max={365}
            onChange={(n) => saveGameConfig({ lonelyDays: n })}
          />
          <NumRow label="寂寞樹：最低倍率" value={cfg.lonelyMin} min={1} max={10} onChange={(n) => saveGameConfig({ lonelyMin: n, lonelyMax: Math.max(n, cfg.lonelyMax) })} />
          <NumRow label="寂寞樹：最高倍率" value={cfg.lonelyMax} min={1} max={10} onChange={(n) => saveGameConfig({ lonelyMax: n, lonelyMin: Math.min(n, cfg.lonelyMin) })} />
          <NumRow label="寂寞樹：每多幾天加 ×1" value={cfg.lonelyStepDays} min={1} max={365} onChange={(n) => saveGameConfig({ lonelyStepDays: n })} />
          <NumRow
            label="受保護樹木：打卡基礎光點"
            note="取代「打卡成功」的基礎點數。開放資料目前沒有受保護樹木名冊，這條規則先不會觸發"
            value={cfg.protectedBase}
            onChange={(n) => saveGameConfig({ protectedBase: n })}
          />
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
        </>,
      )}
      <p className="muted small">
        每一筆都會把用到的規則寫進玩家的光點紀錄，例如「打卡成功・寂寞樹 ×3（模擬）」。同一個行為同一棵樹每天只發一次。
      </p>
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
