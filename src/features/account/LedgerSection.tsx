import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { formatDayTime } from '../../lib/datetime'
import { findTree } from '../../lib/trees'
import { useWishes } from '../../store'
import { useLedger } from '../game/ledger'
import { newestRows, treeLabel, wishLabel, type LedgerRow } from './ledgerRows'

const PREVIEW = 3

function Row({ row, where }: { row: LedgerRow; where: string | null }) {
  const body = (
    <>
      <span className="ledger-main">
        <span className="ledger-reason">{row.reason}</span>
        {where && <span className="ledger-where">{where}</span>}
        <span className="ledger-when">{formatDayTime(row.at)}</span>
      </span>
      <span className={`ledger-delta ${row.delta > 0 ? 'in' : 'out'}`}>
        {row.delta > 0 ? '+' : ''}
        {row.delta}
      </span>
    </>
  )
  if (row.treeId)
    return (
      <Link className="ledger-row linked" to={`/tree/${row.treeId}`} state={{ from: '/me' }} data-testid="ledger-link">
        {body}
      </Link>
    )
  if (row.wishId)
    return (
      <Link className="ledger-row linked" to="/wishes" data-testid="ledger-link">
        {body}
      </Link>
    )
  return <div className="ledger-row">{body}</div>
}

/** 光點紀錄：預設只看最近 3 筆，「看全部」才展開；每一列說明是哪棵樹或哪個願望，點了過去 */
export function LedgerSection() {
  const ledger = useLedger()
  const wishes = useWishes()
  const [all, setAll] = useState(false)
  const rows = useMemo(() => newestRows(ledger), [ledger])
  const shown = useMemo(() => (all ? rows : rows.slice(0, PREVIEW)), [all, rows])
  const treeIds = useMemo(() => [...new Set(shown.map((r) => r.treeId).filter((x): x is string => !!x))], [shown])
  const [trees, setTrees] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    Promise.all(treeIds.map((id) => findTree(id))).then((found) => {
      if (!alive) return
      const next: Record<string, string> = {}
      found.forEach((t, i) => {
        const label = treeLabel(t)
        if (label) next[treeIds[i]] = label
      })
      setTrees(next)
    })
    return () => {
      alive = false
    }
  }, [treeIds])

  const wishById = useMemo(() => new Map(wishes.map((w) => [w.id, w])), [wishes])
  const whereOf = (r: LedgerRow) =>
    r.treeId ? (trees[r.treeId] ?? null) : r.wishId ? wishLabel(wishById.get(r.wishId)) : null

  return (
    <section aria-labelledby="me-ledger-title" data-testid="ledger-section">
      <h2 id="me-ledger-title" className="section-title">
        光點紀錄
      </h2>
      <Card>
        {rows.length === 0 ? (
          <p className="muted">還沒有光點。到樹旁掃樹牌，就會有第一道光。</p>
        ) : (
          <>
            <ul className="ledger" data-testid="ledger-list">
              {shown.map((r, i) => (
                <li key={`${r.at}:${i}`}>
                  <Row row={r} where={whereOf(r)} />
                </li>
              ))}
            </ul>
            {rows.length > PREVIEW && (
              <button
                type="button"
                className="btn ledger-more"
                aria-expanded={all}
                onClick={() => setAll((v) => !v)}
                data-testid="ledger-more"
              >
                {all ? '只看最近 3 筆' : `看全部（${rows.length} 筆）`}
              </button>
            )}
          </>
        )}
      </Card>
    </section>
  )
}
