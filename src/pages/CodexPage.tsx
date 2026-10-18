import { useEffect, useMemo, useState } from 'react'
import { IconBack } from '../components/icons'
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
  const [q, setQ] = useState('')
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

  const query = q.trim()
  // 預設只列遇見過的樹；還沒遇見的收成一句話，不排成一整面灰色格子
  const top = query ? rows.filter((r) => r.species.includes(query)) : rows.filter((r) => met.has(r.species))
  const extra: SpeciesRow[] = []
  const common = rows.slice(0, SHOWN).filter((r) => !met.has(r.species))
  const total = rows.reduce((n, r) => n + r.count, 0)

  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/me">
          <IconBack /> 小芽
        </Link>
        <span className="topbar-title">樹的圖鑑</span>
      </header>
      <p>
        你遇見了 <strong>{met.size}</strong> 種樹。台北共有 {rows.length} 種、{total.toLocaleString()} 棵登錄的樹。
      </p>
      <p className="muted small">在那種樹旁掃樹牌，就會收進圖鑑。棵數為臺北市公園處 2026-10-16 開放資料。</p>
      <input
        className="input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`搜尋 ${rows.length} 種樹，例如：茄苳`}
        aria-label="搜尋樹種"
      />
      {!query && met.size === 0 && (
        <p className="muted">還沒有遇見任何一種。到樹旁掃樹牌，第一種樹就會出現在這裡。</p>
      )}
      {query && top.length === 0 && <p className="muted">台北的登錄資料裡沒有「{query}」。</p>}
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
      {!query && (
        <details className="about">
          <summary>
            還有 {rows.length - met.size} 種等你遇見 <span className="muted small">台北最常見的幾種</span>
          </summary>
          <p className="small">
            {common.slice(0, 20).map((r) => `${r.species}（${r.count.toLocaleString()}）`).join('、')}…
          </p>
        </details>
      )}
    </div>
  )
}
