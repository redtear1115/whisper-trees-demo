import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadDistricts, type District } from '../lib/trees'
import { DEFAULT_WEIGHTS, scoreAll, type Weights } from '../lib/score'
import { setWishStatus, totalWater, useReports, useWishes, wishStatus } from '../store'
import { REPORT_KINDS, STATUS_LABEL, type TreeReport, type WishStatus } from '../store/types'
import { FEASIBILITY_TEXT } from '../features/wish/feasibility'
import { MockTag, relativeDays } from '../components/ui'
import { reportResolved, useOrders } from '../features/vendor/orders'

const WEIGHT_LABEL: Record<keyof Weights, string> = {
  demand: '市民需求',
  shade: '遮蔭缺口',
  feasibility: '可行性',
  fairness: '公平性',
}

const STATUSES = Object.keys(STATUS_LABEL) as WishStatus[]
/** 模擬：計畫開始前已種回的數量 */
const PLANTED_BASE = 412

export default function GovPage() {
  const wishes = useWishes()
  const [districts, setDistricts] = useState<District[]>([])
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    loadDistricts().then(setDistricts)
  }, [])

  const rows = useMemo(() => {
    if (!districts.length) return []
    const perKm = new Map(districts.map((d) => [d.district, d.trees_per_km]))
    const all = districts.map((d) => d.trees_per_km)
    const scores = scoreAll(
      wishes.map((w) => ({
        waterings: totalWater(w),
        treesPerKm: perKm.get(w.district) ?? Math.min(...all),
        feasibility: w.feasibility,
      })),
      weights,
      all,
    )
    // 已種植、不可種的案件排到最後，其餘依分數
    const closed = (w: (typeof wishes)[number]) => ['planted', 'rejected'].includes(wishStatus(w))
    return wishes
      .map((w, i) => ({ wish: w, score: scores[i] }))
      .sort((a, b) => Number(closed(a.wish)) - Number(closed(b.wish)) || b.score.total - a.score.total)
  }, [wishes, weights, districts])

  const planted = wishes.filter((w) => wishStatus(w) === 'planted').length + PLANTED_BASE
  const listRef = useFlip(rows.map((r) => r.wish.id).join())

  return (
    <div className="gov">
      <header className="gov-head">
        <div>
          <h1>補種優先排序</h1>
          <p className="muted small">示範：承辦人視角（公園處）・不需登入</p>
        </div>
        <nav className="row gap">
          <Link className="btn small" to="/">
            市民端
          </Link>
          <Link className="btn small" to="/vendor">
            發包商
          </Link>
          <Link className="btn small" to="/more">
            更多後台
          </Link>
        </nav>
      </header>

      <div className="progress">
        <div className="row between">
          <span>
            把三千棵樹種回來：已種植 <strong>{planted.toLocaleString()}</strong> / 3,164 <MockTag />
          </span>
          <span className="muted small">{((planted / 3164) * 100).toFixed(1)}%</span>
        </div>
        <div className="bar">
          <div style={{ width: `${(planted / 3164) * 100}%` }} />
        </div>
      </div>

      <section className="weights">
        {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
          <label key={k}>
            <span>
              {WEIGHT_LABEL[k]} <strong>{weights[k]}%</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[k]}
              onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
            />
          </label>
        ))}
        <button className="btn small" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
          重設
        </button>
      </section>

      <div className="table-wrap">
      <table className="hot-table">
        <thead>
          <tr>
            <th>#</th>
            <th>位置</th>
            <th>原因</th>
            <th>
              澆水 <MockTag title="含模擬的既有澆水數" />
            </th>
            <th>可行性</th>
            <th>分數</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody ref={listRef}>
          {rows.map(({ wish, score }, i) => (
            <Fragment key={wish.id}>
              <tr data-flip={wish.id} className={open === wish.id ? 'open' : ''}>
                <td>{i + 1}</td>
                <td>
                  <button className="link" onClick={() => setOpen(open === wish.id ? null : wish.id)}>
                    {wish.district} {wish.road}
                  </button>
                  {wish.mock ? <MockTag /> : <span className="new-tag">市民新許願</span>}
                </td>
                <td>{wish.reasons.join('、')}</td>
                <td>{totalWater(wish)}</td>
                <td>{FEASIBILITY_TEXT[wish.feasibility]}</td>
                <td>
                  <strong>{Math.round(score.total * 100)}</strong>
                </td>
                <td>
                  <StatusPicker wishId={wish.id} current={wishStatus(wish)} />
                </td>
              </tr>
              {open === wish.id && (
                <tr className="breakdown">
                  <td />
                  <td colSpan={6}>
                    {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
                      <span key={k} className="part">
                        {WEIGHT_LABEL[k]} {score[k].toFixed(2)} × {weights[k]}%
                      </span>
                    ))}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>

      <ReportsByRoad />

      <p className="muted small">
        分數：四項各自正規化到 0–1 後加權平均。遮蔭缺口與公平性依行政區「每公里人行道的行道樹數」（開放資料推算）；
        市民需求為澆水數取對數。
      </p>
    </div>
  )
}

function StatusPicker({ wishId, current }: { wishId: string; current: WishStatus }) {
  const [pending, setPending] = useState<WishStatus | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)

  if (pending === 'rejected')
    return (
      <form
        className="reject-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!setWishStatus(wishId, 'rejected', reason)) return setError(true)
          setPending(null)
          setReason('')
        }}
      >
        <input
          className="input"
          autoFocus
          value={reason}
          placeholder="不可種的原因（必填）"
          onChange={(e) => {
            setReason(e.target.value)
            setError(false)
          }}
          aria-invalid={error}
        />
        {error && <span className="error small">一定要填原因</span>}
        <div className="row gap">
          <button className="btn small primary" disabled={!reason.trim()}>
            送出
          </button>
          <button type="button" className="btn small" onClick={() => setPending(null)}>
            取消
          </button>
        </div>
      </form>
    )

  return (
    <select
      className={`status-select s-${current}`}
      value={current}
      onChange={(e) => {
        const next = e.target.value as WishStatus
        if (next === 'rejected') setPending('rejected')
        else setWishStatus(wishId, next)
      }}
      aria-label="案件狀態"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}

/** 排序改變時，列從舊位置滑到新位置 */
function useFlip(order: string) {
  const ref = useRef<HTMLTableSectionElement>(null)
  const prev = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const body = ref.current
    if (!body) return
    const rowsNow = [...body.querySelectorAll<HTMLElement>('[data-flip]')]
    const next = new Map<string, number>()
    for (const r of rowsNow) {
      const id = r.dataset.flip!
      const top = r.getBoundingClientRect().top
      next.set(id, top)
      const before = prev.current.get(id)
      if (before !== undefined && before !== top) {
        r.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
          duration: 300,
          easing: 'ease-out',
        })
      }
    }
    prev.current = next
  }, [order])
  return ref
}

/** 樹況回報依路段彙整：每段幾筆、兩類各幾筆 */
function ReportsByRoad() {
  const reports = useReports()
  const orders = useOrders()
  const groups = new Map<string, TreeReport[]>()
  for (const r of reports) {
    const k = `${r.district} ${r.road}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  return (
    <section>
      <h2 className="section-title">
        樹況回報（依路段） <MockTag title="含模擬的示範回報" />
      </h2>
      {rows.length === 0 && <p className="muted">目前沒有回報。</p>}
      <div className="report-list">
        {rows.map(([road, list]) => {
          const count = (k: TreeReport['kind']) => list.filter((r) => r.kind === k).length
          return (
            <div key={road} className="report-road">
              <div className="row between center-v">
                <strong>{road}</strong>
                <span className="small">
                  共 {list.length} 筆・{REPORT_KINDS.pruning.label} {count('pruning')}・{REPORT_KINDS.sick.label}{' '}
                  {count('sick')}
                </span>
              </div>
              <ul>
                {list.map((r) => (
                  <li key={r.id} className="small">
                    <span className={`kind-tag ${r.kind}`}>{REPORT_KINDS[r.kind].label}</span>
                    {r.species}（<span className="mono">{r.treeId}</span>）{r.details.join('、')}
                    {r.note && `：${r.note}`}
                    {r.hasPhoto && ' 📷'}
                    <span className="muted">・{relativeDays(r.at)}</span>
                    {!r.mock && <span className="new-tag">市民新回報</span>}
                    {reportResolved(r.id, orders) && <span className="status-pill s-planted">廠商已處理</span>}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
