import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TabHeader } from '../features/nav/TabLayout'
import { Art, Card, formatDate } from '../components/ui'
import { useStore, useWishes } from '../store'
import { baseLedger } from '../features/game/ledger'
import { ACTION_LABEL } from '../features/game/config'
import {
  PREFIX_DISTRICT,
  earnedStampsNewestFirst,
  lightByDistrict,
  progressText,
  shortName,
  stampBook,
  type District,
  type DistrictLedger,
  type DistrictStamps,
} from '../features/game/districts'

type View = 'map' | 'time'

/** 行政區 → 樹籍前綴（畫面的 data-testid 與格子位置用） */
const PREFIX_OF = Object.fromEntries(Object.entries(PREFIX_DISTRICT).map(([p, d]) => [d, p])) as Record<District, string>

export default function StampsPage() {
  const checkins = useStore((s) => s.checkins)
  const ledger = useStore((s) => baseLedger(s))
  const wishes = useWishes()
  const [view, setView] = useState<View>('map')
  const [picked, setPicked] = useState<District | null>(null)

  const book = useMemo(() => stampBook(checkins), [checkins])
  const light = useMemo(() => lightByDistrict(ledger, wishes), [ledger, wishes])
  const stamps = useMemo(() => earnedStampsNewestFirst(book), [book])
  const byDistrict = useMemo(() => new Map(book.map((b) => [b.district, b])), [book])
  const pickedBook = picked ? byDistrict.get(picked) : undefined

  return (
    <div className="page">
      <TabHeader title="集章冊" />
      <p>
        在各區的樹旁掃樹牌，每棵不同的樹算一次。已集到 <strong data-testid="stamp-count">{stamps.length}</strong> 枚章。
      </p>
      <p className="muted small">不用急，哪一區先走、走多少都可以。圖案是佔位美術。</p>

      <div className="segmented" role="group" aria-label="檢視方式">
        <button className={view === 'map' ? 'on' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')} data-testid="view-map">
          示意地圖
        </button>
        <button className={view === 'time' ? 'on' : ''} aria-pressed={view === 'time'} onClick={() => setView('time')} data-testid="view-time">
          依取得時間
        </button>
      </div>

      {view === 'map' ? (
        <>
          <div className="stamp-map" data-testid="stamp-map" role="list">
            {book.map((b) => (
              <DistrictCard key={b.district} b={b} on={picked === b.district} onPick={() => setPicked(b.district)} />
            ))}
          </div>
          <p className="muted small">位置是示意，不是精確的地圖。點一區看進度與光點。</p>
        </>
      ) : stamps.length === 0 ? (
        <p className="muted" data-testid="stamp-list-empty">
          還沒有章。到樹旁掃樹牌，第一枚鐵章就會出現在這裡。
        </p>
      ) : (
        <Card>
          <ul className="stamp-list" data-testid="stamp-list">
            {stamps.map((e) => (
              <li key={`${e.district}-${e.tier.id}`} data-testid="stamp-item" data-district={e.district} data-tier={e.tier.id}>
                <Art id={e.tier.art} alt="" className="icon" />
                <span>
                  <strong>
                    {e.district}・{e.tier.name}
                  </strong>
                  <br />
                  <span className="muted small">{formatDate(e.earnedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pickedBook && (
        <DistrictSheet
          b={pickedBook}
          light={light.get(pickedBook.district)}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  )
}

function DistrictCard({ b, on, onPick }: { b: DistrictStamps; on: boolean; onPick: () => void }) {
  const prefix = PREFIX_OF[b.district]
  return (
    <button
      type="button"
      role="listitem"
      className={`stamp-card ${b.top ? '' : 'locked'} ${on ? 'on' : ''}`}
      style={{ gridArea: prefix.toLowerCase() }}
      onClick={onPick}
      data-testid={`district-${prefix}`}
      data-tier={b.top?.id ?? 'none'}
      data-count={b.distinct}
      aria-label={`${b.district}：${b.top ? b.top.name : '未開始'}，${b.distinct} 棵`}
    >
      <Art id={b.top?.art ?? 'stamp-iron'} alt="" className="icon" />
      <strong>{shortName(b.district)}</strong>
      <span className="small">{b.top ? b.top.name : '未開始'}</span>
      <span className="small muted">{b.distinct} 棵</span>
    </button>
  )
}

function DistrictSheet({
  b,
  light,
  onClose,
}: {
  b: DistrictStamps
  light: DistrictLedger | undefined
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const items = light?.items ?? []

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="stamp-sheet" role="dialog" aria-label={`${b.district}集章`} tabIndex={-1} ref={ref} data-testid="district-detail" data-district={b.district}>
      <div className="sheet-grip" aria-hidden />
      <button className="sheet-close" onClick={onClose} data-testid="district-close">
        關閉
      </button>
      <h2>
        {b.district}
        {b.top && (
          <>
            ・{b.top.name}
          </>
        )}
      </h2>
      <div className="stamp-tiers">
        {b.earned.length === 0 && <span className="muted small">還沒有章</span>}
        {b.earned.map((e) => (
          <span key={e.tier.id} className="stamp-tier" data-testid={`tier-${e.tier.id}`}>
            <Art id={e.tier.art} alt={e.tier.name} className="icon" />
            <span className="small">{formatDate(e.earnedAt)}</span>
          </span>
        ))}
      </div>
      <p data-testid="district-progress">{progressText(b)}</p>
      <div className="bar" aria-hidden>
        <div style={{ width: `${b.next ? Math.min(100, (b.distinct / b.next.min) * 100) : 100}%` }} />
      </div>
      <p className="muted small">不同的樹各算一次，同一棵樹再來不會多算。</p>
      <p>
        這一區收集的光點：<strong data-testid="district-light-total">{light?.total ?? 0}</strong>
      </p>
      <details className="about" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary data-testid="district-ledger-toggle">這一區的光點紀錄（{items.length} 筆）</summary>
        {open &&
          (items.length === 0 ? (
            <p className="muted small">還沒有。到這一區的樹旁掃樹牌，光點就會記在這裡。</p>
          ) : (
            <ul className="ledger" data-testid="district-ledger">
              {items.map((i, n) => (
                <li key={n}>
                  <span>
                    {i.treeId ? (
                      <Link className="mono" to={`/tree/${i.treeId}`}>
                        {i.treeId}
                      </Link>
                    ) : (
                      <>許願路：{i.wishRoad ?? '（未命名）'}</>
                    )}
                    ・{ACTION_LABEL[i.action]}
                    <span className="muted small">・{formatDate(i.at)}</span>
                  </span>
                  <span className="plus">+{i.delta}</span>
                </li>
              ))}
            </ul>
          ))}
      </details>
      <p className="muted small">只統計「在這一區的樹或許願」得到的光點；花掉的光點和客服補發不列在這裡。</p>
    </div>
  )
}
