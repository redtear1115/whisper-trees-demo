import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, formatDate } from '../components/ui'
import { useStore } from '../store'
import { TabHeader } from '../features/nav/TabLayout'
import { journalEntries } from '../features/journal/journal'
import { MyWishes } from './MyWishesPage'

/** 樹洞：我在各棵樹留下的話（新到舊），加上我的許願 */
export default function JournalPage() {
  const whispers = useStore((s) => s.whispers)
  const rows = useMemo(() => journalEntries(whispers), [whispers])

  return (
    <div className="page">
      <TabHeader title="樹洞" />
      <p className="muted small">只有你看得到。想留新的話，到樹旁掃樹牌，進樹的頁面。</p>

      <h2 className="section-title">我留下的話</h2>
      {rows.length === 0 ? (
        <p className="muted" data-testid="journal-empty">
          還沒有留過話。到樹旁掃樹牌，在樹洞留一句話，就會收在這裡。
        </p>
      ) : (
        <ul className="journal-list" data-testid="journal-list">
          {rows.map((r, i) => (
            <li key={`${r.treeId}:${r.at}:${i}`}>
              <Card className="journal-item">
                <Link className="journal-link" to={`/tree/${r.treeId}`} state={{ from: '/journal' }} data-testid="journal-item">
                  <span className="muted small">
                    <span className="mono">{r.treeId}</span>・{formatDate(r.at)}
                  </span>
                  <span className="journal-text">{r.text}</span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">我的許願</h2>
      <MyWishes sub />
    </div>
  )
}
