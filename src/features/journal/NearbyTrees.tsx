import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findTree, type Tree } from '../../lib/trees'
import { walkTarget } from '../../lib/geo'
import { isDemoMode, recentCheckin, setDemoPosition, useStore } from '../../store'
import { ringRadius } from '../map/ring'
import { useAnchor } from '../map/useAnchor'
import { bearingTo, compassLabel, formatDistance, leaveTarget, loadNearbyTrees, nearbyAction, nearbyLabel, treeNumberTail, type NearbyTree } from './nearby'

/** 先列幾棵，其餘按「看更多」才展開，讓下面的日記與許願不被擠到很下面 */
export const NEARBY_FIRST = 3

/** 樹洞頁：目前位置附近的樹。在打卡範圍內才能「留言」（仍要先掃樹牌）；太遠先「走過去」（Demo）或「怎麼走」。 */
export function NearbyTrees() {
  const navigate = useNavigate()
  const anchor = useAnchor(true)
  const checkins = useStore((s) => s.checkins)
  const [rows, setRows] = useState<(NearbyTree & { tree: Tree | null })[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const located = anchor.source !== 'fallback'
  const radius = ringRadius(anchor) ?? 0
  const demo = isDemoMode()
  const [lon, lat] = anchor.lngLat

  useEffect(() => {
    if (!located) return
    let alive = true
    loadNearbyTrees([lon, lat]).then(async (list) => {
      const trees = await Promise.all(list.map((t) => findTree(t.id)))
      if (alive) setRows(list.map((t, i) => ({ ...t, tree: trees[i] })))
    })
    return () => {
      alive = false
    }
  }, [located, lon, lat])

  // checkins 變動時重算「是否已在現場」
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSite = useMemo(() => new Set((rows ?? []).filter((r) => recentCheckin(r.id)).map((r) => r.id)), [rows, checkins])

  return (
    <section data-testid="journal-nearby" aria-labelledby="journal-nearby-title">
      <h2 className="section-title" id="journal-nearby-title">附近的樹</h2>
      {!located ? (
        <p className="muted">還沒有你的位置。打開定位，或用 Demo 模式。</p>
      ) : rows === null ? (
        <p className="muted">正在找附近的樹…</p>
      ) : rows.length === 0 ? (
        <p className="muted">這附近 150 公尺內沒有樹的資料。</p>
      ) : (
        <ul className="nearby-list" id="journal-nearby-list">
          {(showAll ? rows : rows.slice(0, NEARBY_FIRST)).map((r, i) => (
            <li key={r.id}>
              <section className="card nearby-item" data-testid="journal-nearby-item">
                <div className="nearby-info">
                  <span className="nearby-name">{r.tree?.species ?? '一棵樹'}</span>
                  <span className="muted small nearby-meta">
                    {r.tree?.place ? `${r.tree.place}・` : ''}
                    {compassLabel(bearingTo(anchor.lngLat, r.lngLat))}・<span className="nearby-dist">{formatDistance(r.distance)}</span>
                  </span>
                  <span className="muted small nearby-tag" data-testid="journal-nearby-number">
                    樹牌 {treeNumberTail(r.id)}
                  </span>
                </div>
                {(() => {
                  const action = nearbyAction(r.distance, radius, demo)
                  const go = () => {
                    if (action === 'walk') return setDemoPosition(walkTarget(anchor.lngLat, r.lngLat))
                    if (action === 'route') return navigate('/', { state: { routeTreeId: r.id } })
                    const t = leaveTarget(r.id, onSite.has(r.id))
                    navigate(t.to, { state: t.state })
                  }
                  return (
                    <button
                      // 只有最近的一棵是主要按鈕，其餘是外框按鈕，免得三顆一樣重
                      className={i === 0 ? 'btn primary' : 'btn'}
                      data-testid={action === 'leave' ? 'journal-nearby-leave' : `journal-nearby-${action}`}
                      aria-label={`${nearbyLabel(action, onSite.has(r.id))}：${r.tree?.species ?? '一棵樹'}`}
                      onClick={go}
                    >
                      {nearbyLabel(action, onSite.has(r.id))}
                    </button>
                  )
                })()}
              </section>
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length > NEARBY_FIRST && (
        <button
          className="btn block nearby-more"
          data-testid="journal-nearby-more"
          aria-expanded={showAll}
          aria-controls="journal-nearby-list"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? '收起' : `看更多（還有 ${rows.length - NEARBY_FIRST} 棵）`}
        </button>
      )}
    </section>
  )
}
