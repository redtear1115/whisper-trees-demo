import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Art, formatDate } from '../components/ui'
import { useStore } from '../store'
import type { Checkin } from '../store/types'

interface SpeciesRow {
  species: string
  count: number
  street: number
  park: number
}

const SHOWN = 40

export default function CodexPage() {
  const [rows, setRows] = useState<SpeciesRow[]>([])
  const checkins = useStore((s) => s.checkins)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/species.json`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]))
  }, [])

  const met = useMemo(() => {
    const m = new Map<string, Checkin>()
    for (const c of checkins) if (c.species && !m.has(c.species)) m.set(c.species, c)
    return m
  }, [checkins])

  const top = rows.slice(0, SHOWN)
  // 前 40 名以外但遇見過的樹種也要列出來
  const extra = rows.slice(SHOWN).filter((r) => met.has(r.species))
  const total = rows.reduce((n, r) => n + r.count, 0)

  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost" to="/me">
          ← 小芽
        </Link>
        <span className="topbar-title">樹的圖鑑</span>
      </header>
      <p>
        你遇見了 <strong>{met.size}</strong> 種樹。台北共有 {rows.length} 種、{total.toLocaleString()} 棵登錄的樹。
      </p>
      <p className="muted small">在那種樹旁掃樹牌，就會收進圖鑑。棵數為臺北市公園處 2026-10-16 開放資料。</p>
      <div className="grid-cards">
        {[...top, ...extra].map((r) => {
          const c = met.get(r.species)
          return (
            <div key={r.species} className={`tile ${c ? '' : 'locked'}`}>
              <Art id="species-card" alt="" />
              <strong>{r.species}</strong>
              <span className="small muted">全市 {r.count.toLocaleString()} 棵</span>
              {c ? (
                <span className="small">
                  {formatDate(c.at)} 遇見
                  <br />
                  <Link className="mono" to={`/tree/${c.treeId}`}>
                    {c.treeId}
                  </Link>
                </span>
              ) : (
                <span className="small muted">還沒遇見</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
