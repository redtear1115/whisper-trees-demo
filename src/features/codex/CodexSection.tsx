import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Art, formatDate } from '../../components/ui'
import { useStore } from '../../store'
import { useViewedFlag } from '../onboarding/viewed'
import { InsectSection } from './InsectSection'
import { PhotoCarousel } from '../species/PhotoCarousel'
import { loadSpeciesPhotos, photoUrl, type SpeciesPhoto } from '../../lib/speciesPhotos'
import type { Checkin } from '../../store/types'

interface SpeciesRow {
  species: string
  count: number
  street: number
  park: number
}

const SHOWN = 40

/** 樹的圖鑑（放在集章冊的「探索」）。真的捲到畫面上時記 viewedCodexAt。 */
export function CodexSection() {
  const [rows, setRows] = useState<SpeciesRow[]>([])
  const [q, setQ] = useState('')
  const [photos, setPhotos] = useState<Record<string, SpeciesPhoto[]>>({})
  const [open, setOpen] = useState<string | null>(null)
  const checkins = useStore((s) => s.checkins)
  const ref = useRef<HTMLElement>(null)
  useViewedFlag('viewedCodexAt', ref)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/species.json`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]))
  }, [])

  // 打卡後的「看圖鑑」連到 #insects：樹種清單載入、版面定下來之後再捲過去
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#insects' && rows.length) document.getElementById('insects')?.scrollIntoView({ block: 'start' })
  }, [hash, rows.length, photos])

  useEffect(() => {
    let alive = true
    loadSpeciesPhotos().then((i) => alive && setPhotos(i.species))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const met = useMemo(() => {
    const m = new Map<string, Checkin>()
    for (const c of checkins) if (c.species && !m.has(c.species)) m.set(c.species, c)
    return m
  }, [checkins])

  const query = q.trim()
  // 預設只列遇見過的樹；還沒遇見的收成一句話，不排成一整面灰色格子
  const top = query ? rows.filter((r) => r.species.includes(query)) : rows.filter((r) => met.has(r.species))
  const common = rows.slice(0, SHOWN).filter((r) => !met.has(r.species))
  const total = rows.reduce((n, r) => n + r.count, 0)

  return (
    <section ref={ref} data-testid="codex-section" aria-labelledby="codex-title">
      <h2 className="section-title" id="codex-title">
        樹的圖鑑
      </h2>
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
        {top.map((r) => {
          const c = met.get(r.species)
          return (
            <div key={r.species} className={`tile ${c ? '' : 'locked'}`}>
              {c && photos[r.species] ? (
                <button
                  type="button"
                  className="tile-photo"
                  onClick={() => setOpen(r.species)}
                  aria-label={`看${r.species}的照片`}
                  data-testid="codex-photo"
                >
                  <img src={photoUrl(photos[r.species][0].src)} alt="" loading="lazy" decoding="async" />
                  <span className="tile-credit">{photos[r.species][0].credit}</span>
                </button>
              ) : (
                <Art id="species-card" alt="" />
              )}
              <strong>{r.species}</strong>
              <span className="small muted">全市 {r.count.toLocaleString()} 棵</span>
              {c ? (
                <>
                  <span className="small">{formatDate(c.at)} 遇見</span>
                  <Link className="tile-tree-link" to={`/tree/${c.treeId}`} state={{ from: '/stamps?tab=explore' }} aria-label={`看這棵樹：${r.species}，${c.treeId}`}>
                    看這棵樹 ›
                  </Link>
                </>
              ) : (
                <span className="small muted">還沒遇見</span>
              )}
            </div>
          )
        })}
      </div>
      {open && photos[open] && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal species-detail" role="dialog" aria-modal="true" aria-label={`${open}的照片`} data-testid="species-detail">
            <h2>{open}</h2>
            <PhotoCarousel species={open} photos={photos[open]} />
            <p className="muted small">照片來自 iNaturalist 的觀察紀錄，只收 CC0 與 CC BY 授權。</p>
            <button className="btn primary block" onClick={() => setOpen(null)} autoFocus>
              關上
            </button>
          </div>
        </div>
      )}
      {!query && <InsectSection />}
      {!query && (
        <details className="about">
          <summary>台北最常見的樹</summary>
          <p className="small">
            {common.slice(0, 20).map((r) => `${r.species}（${r.count.toLocaleString()}）`).join('、')}…
          </p>
        </details>
      )}
    </section>
  )
}
