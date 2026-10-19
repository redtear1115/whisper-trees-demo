import { Fragment, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { loadDistricts, type District } from '../lib/trees'
import { DEFAULT_WEIGHTS, scoreAll, type Weights } from '../lib/score'
import { setWishStatus, totalWater, useReports, useWishes, wishStatus } from '../store'
import { REPORT_KINDS, STATUS_LABEL, type TreeReport, type WishStatus } from '../store/types'
import { FEASIBILITY_TEXT } from '../features/wish/feasibility'
import { MockTag, relativeDays } from '../components/ui'
import { IconCamera } from '../components/icons'
import { reportResolved, useOrders } from '../features/vendor/orders'
import { NOTICES, useMyOpinions } from '../features/notice/notices'

const GovMap = lazy(() => import('../features/gov/GovMap').then((m) => ({ default: m.GovMap })))

const WEIGHT_LABEL: Record<keyof Weights, string> = {
  demand: '市民需求',
  shade: '遮蔭缺口',
  feasibility: '可行性',
  fairness: '公平性',
}

const STATUSES = Object.keys(STATUS_LABEL) as WishStatus[]

/** 一鍵切換的權重組合，Demo 時看得出排序明顯改變 */
const PRESETS: [string, Weights][] = [
  ['平均', DEFAULT_WEIGHTS],
  ['重視市民聲音', { demand: 70, shade: 10, feasibility: 10, fairness: 10 }],
  ['重視缺蔭地區', { demand: 10, shade: 45, feasibility: 10, fairness: 35 }],
]
/** 模擬：計畫開始前已種回的數量 */
const PLANTED_BASE = 412

export default function GovPage() {
  const wishes = useWishes()
  const [districts, setDistricts] = useState<District[]>([])
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const [open, setOpen] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [onlyNew, setOnlyNew] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)

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

  const mapRows = useMemo(() => rows.map((r) => ({ wish: r.wish, score: r.score.total })), [rows])
  const planted = wishes.filter((w) => wishStatus(w) === 'planted').length + PLANTED_BASE
  const listRef = useFlip(rows.map((r) => r.wish.id).join())

  return (
    <div className="gov">
      <header className="gov-head">
        <div>
          <h1>補種優先排序</h1>
          <p className="muted small">示範：承辦人視角（公園處）・不需登入</p>
        </div>
        <AdminNav />
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
              {WEIGHT_LABEL[k]}{' '}
              <strong className="num">{share(weights, k)}%</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[k]}
              aria-valuetext={`${WEIGHT_LABEL[k]}佔 ${share(weights, k)}%`}
              onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
            />
          </label>
        ))}
        <div className="presets" role="group" aria-label="快速設定">
          {PRESETS.map(([label, w]) => (
            <button key={label} className="btn small" onClick={() => setWeights(w)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="row gap wrap center-v" style={{ marginBottom: 8 }}>
        <div className="segmented" role="group" aria-label="檢視">
          <button className={!showMap ? 'on' : ''} aria-pressed={!showMap} onClick={() => setShowMap(false)}>
            清單
          </button>
          <button className={showMap ? 'on' : ''} aria-pressed={showMap} onClick={() => setShowMap(true)}>
            清單＋地圖
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
          只看市民新許願（{rows.filter((r) => !r.wish.mock).length}）
        </label>
      </div>
      <p className="muted small">
        列表含示範資料 <MockTag />；黃色標籤是這台裝置上市民剛送出的許願。點位置可以看分數怎麼算。
      </p>
      <p className="toast" role="status" aria-live="polite">
        {toast && (
          <>
            {toast.text}
            {toast.undo && (
              <button
                className="link"
                onClick={() => {
                  toast.undo?.()
                  setToast({ text: '已復原。' })
                }}
              >
                復原
              </button>
            )}
          </>
        )}
      </p>
      <div className={showMap ? 'gov-split' : ''}>
      {showMap && (
        <Suspense fallback={<div className="gov-map muted">地圖載入中…</div>}>
          <GovMap
            rows={onlyNew ? mapRows.filter((r) => !r.wish.mock) : mapRows}
            onPick={(id) => {
              setOpen(id)
              document.querySelector(`[data-flip="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        </Suspense>
      )}
      <div className="table-wrap">
      <table className="hot-table">
        <thead>
          <tr>
            <th>#</th>
            <th>位置</th>
            <th>原因</th>
            <th>澆水</th>
            <th>可行性</th>
            <th>分數</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody ref={listRef}>
          {(onlyNew ? rows.filter((r) => !r.wish.mock) : rows).map(({ wish, score }, i, list) => (
            <Fragment key={wish.id}>
              {['planted', 'rejected'].includes(wishStatus(wish)) &&
                !['planted', 'rejected'].includes(wishStatus(list[i - 1]?.wish ?? wish)) && (
                  <tr className="divider-row">
                    <td colSpan={7}>已結案（已種植、不可種）</td>
                  </tr>
                )}
              <tr data-flip={wish.id} className={open === wish.id ? 'open' : ''}>
                <td>{i + 1}</td>
                <td>
                  <button
                    className="link"
                    onClick={() => setOpen(open === wish.id ? null : wish.id)}
                    aria-expanded={open === wish.id}
                  >
                    {wish.district} {wish.road}
                  </button>
                  {!wish.mock && <span className="new-tag">市民新許願</span>}
                  <span className="pit-id num">{wish.pitId ? `樹穴 ${wish.pitId}` : '非樹穴，需會勘'}</span>
                </td>
                <td>{wish.reasons.join('、')}</td>
                <td>{totalWater(wish)}</td>
                <td>{FEASIBILITY_TEXT[wish.feasibility]}</td>
                <td className={['planted', 'rejected'].includes(wishStatus(wish)) ? 'score closed' : 'score'}>
                  <strong className="num">{Math.round(score.total * 100)}</strong>
                </td>
                <td>
                  <StatusPicker
                    wishId={wish.id}
                    place={`${wish.district} ${wish.road}`}
                    current={wishStatus(wish)}
                    onChanged={(next, prev) =>
                      setToast({
                        text: `${wish.district} ${wish.road} 改為「${STATUS_LABEL[next]}」，市民端會即時看到。`,
                        undo: () => setWishStatus(wish.id, prev),
                      })
                    }
                  />
                </td>
              </tr>
              {open === wish.id && (
                <tr className="breakdown">
                  <td />
                  <td colSpan={6}>
                    {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
                      <span key={k} className="part">
                        {WEIGHT_LABEL[k]} {score[k].toFixed(2)} × {share(weights, k)}%
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

      </div>

      <ReportsByRoad />

      <Notices />

      <p className="muted small">
        分數：四項各自正規化到 0–1 後加權平均。遮蔭缺口與公平性依行政區「每公里人行道的行道樹數」（開放資料推算）；
        市民需求為澆水數取對數。
      </p>
    </div>
  )
}

/** 權重佔四項總和的百分比；用最大餘數法取整，四項加起來一定是 100 */
function share(w: Weights, k: keyof Weights): number {
  const keys = Object.keys(w) as (keyof Weights)[]
  const sum = keys.reduce((n, x) => n + w[x], 0)
  if (!sum) return 0
  const raw = keys.map((x) => ({ x, v: (w[x] / sum) * 100 }))
  const floor = raw.map((r) => ({ ...r, f: Math.floor(r.v) }))
  let left = 100 - floor.reduce((n, r) => n + r.f, 0)
  const order = [...floor].sort((a, b) => b.v - b.f - (a.v - a.f))
  const out = new Map(floor.map((r) => [r.x, r.f]))
  for (const r of order) if (left-- > 0) out.set(r.x, r.f + 1)
  return out.get(k) ?? 0
}

function StatusPicker({
  wishId,
  place,
  current,
  onChanged,
}: {
  wishId: string
  place: string
  current: WishStatus
  onChanged: (next: WishStatus, prev: WishStatus) => void
}) {
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
          onChanged('rejected', current)
          setPending(null)
          setReason('')
        }}
      >
        <input
          className="input"
          autoFocus
          value={reason}
          aria-label={`${place} 不可種的原因`}
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
        if (next === 'rejected') return setPending('rejected')
        if (setWishStatus(wishId, next)) onChanged(next, current)
      }}
      aria-label={`${place} 的案件狀態`}
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
        // 名次有變的列滑到新位置，並短暫標亮，讓人看得出誰動了
        r.animate(
          [
            { transform: `translateY(${before - top}px)`, backgroundColor: '#fbefc8' },
            { transform: 'none', backgroundColor: '#fbefc8', offset: 0.5 },
            { transform: 'none', backgroundColor: 'transparent' },
          ],
          { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
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
                    {r.hasPhoto && (
                      <span className="has-photo" aria-label="附照片">
                        {' '}
                        <IconCamera />
                      </span>
                    )}
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

/** 移樹前公告（模擬）與市民意見 */
function Notices() {
  const mine = useMyOpinions()
  return (
    <section>
      <h2 className="section-title">
        移樹前公告 <MockTag />
      </h2>
      <p className="muted small">動一棵樹之前先公告，附近的人掃樹牌時會看到，並可以留一句意見。</p>
      <div className="report-list">
        {NOTICES.map((n) => (
          <div key={n.id} className="report-road">
            <div className="row between center-v" style={{ gap: 8, flexWrap: 'wrap' }}>
              <strong>
                {n.place}・{n.species}（<span className="mono">{n.treeId}</span>）
              </strong>
              <span className="small">
                {n.date} {n.action}・意見 {n.opinions + (mine[n.id] ? 1 : 0)} 則
              </span>
            </div>
            <p className="small">原因：{n.reason}</p>
            {mine[n.id] && (
              <p className="small">
                <span className="new-tag">市民新意見</span> 「{mine[n.id]}」
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
