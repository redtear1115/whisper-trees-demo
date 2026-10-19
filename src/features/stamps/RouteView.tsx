import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnchor } from '../map/useAnchor'
import { loadRoadGraph, planTreeTour, type RoadGraph } from '../../lib/route'
import type { Village } from '../../lib/villages'
import { loadTreePoints, routeCandidates, tourSummary, type TreePoint } from './villageTrees'

const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })))

const MAX_STOPS = 8

type Loaded = { trees: TreePoint[]; graph: RoadGraph } | 'failed' | null

/** 第 3 層：從你的位置出發，走訪這一里最近、還沒點亮的樹（最多 8 棵）。 */
export function RouteView({ prefix, village, lit }: { prefix: string; village: Village; lit: ReadonlySet<string> }) {
  const anchor = useAnchor(true)
  const [data, setData] = useState<Loaded>(null)

  useEffect(() => {
    let alive = true
    setData(null)
    Promise.all([loadTreePoints(prefix), loadRoadGraph(prefix)]).then(([trees, graph]) => {
      if (alive) setData(trees && graph ? { trees, graph } : 'failed')
    })
    return () => {
      alive = false
    }
  }, [prefix])

  const hasPosition = anchor.source !== 'fallback'
  const here = anchor.lngLat.join()
  const plan = useMemo(() => {
    if (!hasPosition || !data || data === 'failed') return null
    const candidates = routeCandidates(data.trees, village, lit, anchor.lngLat)
    if (!candidates.length) return { kind: 'done' as const }
    const tour = planTreeTour(data.graph, anchor.lngLat, candidates, MAX_STOPS)
    return tour ? { kind: 'tour' as const, tour } : { kind: 'none' as const }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, village, lit, hasPosition, here])

  if (!hasPosition) {
    return (
      <p className="atlas-note" data-testid="route-need-location">
        需要你的位置才能規劃路線（或用 Demo 模式）
      </p>
    )
  }
  if (data === 'failed') return <p className="atlas-note" data-testid="route-failed">路網資料暫時載入失敗，晚點再試試看。</p>
  if (!data || !plan) return <p className="atlas-note" aria-live="polite">正在規劃路線…</p>
  if (plan.kind === 'done') return <p className="atlas-note" data-testid="route-done">{village.name}的樹都點亮了，沒有要規劃的路線。</p>
  if (plan.kind === 'none') return <p className="atlas-note" data-testid="route-none">從你的位置找不到走得到這一里的路線。</p>

  const { tour } = plan
  return (
    <div className="route-view" data-testid="route-view" data-stops={tour.stops.length}>
      <p className="atlas-summary" data-testid="route-summary" aria-live="polite">
        {tourSummary(tour.meters, tour.minutes, tour.stops.length)}
      </p>
      <Suspense fallback={<div className="route-map" aria-hidden="true" />}>
        <RouteMap tour={tour} />
      </Suspense>
      <ol className="route-stops" data-testid="route-stops">
        {tour.stops.map((s) => (
          <li key={s.id}>
            <Link className="mono" to={`/tree/${s.id}`}>
              {s.id}
            </Link>
          </li>
        ))}
      </ol>
      <p className="muted small">建議路線，只含具名道路；實際請依現場路況與號誌行走，路線會隨你的位置更新。</p>
    </div>
  )
}
