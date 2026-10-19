import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { IconChevron } from '../../components/icons'
import { formatDayTime } from '../../lib/datetime'
import { findTree } from '../../lib/trees'
import { useStore } from '../../store'
import { journalEntries } from './journal'

const formatAt = formatDayTime

/** 我的日記：我在各棵樹留下的話（新到舊） */
export function DiaryList() {
  const whispers = useStore((s) => s.whispers)
  const rows = useMemo(() => journalEntries(whispers), [whispers])
  const ids = useMemo(() => [...new Set(rows.map((r) => r.treeId))], [rows])
  const [labels, setLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    Promise.all(ids.map((id) => findTree(id))).then((trees) => {
      if (!alive) return
      const next: Record<string, string> = {}
      trees.forEach((t, i) => {
        if (t) next[ids[i]] = `${t.district}・${t.species}`
      })
      setLabels(next)
    })
    return () => {
      alive = false
    }
  }, [ids])

  if (rows.length === 0)
    return (
      <p className="muted" data-testid="journal-empty">
        還沒有留過話。到樹旁掃樹牌，在樹洞留一句話，就會收在這裡。
      </p>
    )
  return (
    <ul className="journal-list" data-testid="journal-list">
      {rows.map((r, i) => (
        <li key={`${r.treeId}:${r.at}:${i}`}>
          <section className="card journal-item" data-testid="journal-item">
            <span className="muted small">
              {formatAt(r.at)}・{labels[r.treeId] ?? <span className="mono">{r.treeId}</span>}
            </span>
            <span className="journal-text">{r.text}</span>
            <Link className="journal-more" to={`/tree/${r.treeId}`} state={{ from: '/journal' }} data-testid="journal-view-tree">
              查看樹木
              <IconChevron />
            </Link>
          </section>
        </li>
      ))}
    </ul>
  )
}
