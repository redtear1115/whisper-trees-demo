import { useEffect, useMemo, useState } from 'react'
import { findTree } from '../../lib/trees'
import type { LngLat } from '../../lib/geo'
import { useStore } from '../../store'
import { clearedCenters, exploredTreeIds, fogStat, type FogStat } from './fog'

export interface FogState extends FogStat {
  centers: LngLat[]
  /** 座標還在查的時候是 true */
  loading: boolean
  /** 有打卡過的樹，但一棵座標都查不到（多半是網路）；retry() 重查 */
  failed: boolean
  retry: () => void
}

const EMPTY: LngLat[] = []

/** 依自己的打卡紀錄算出清出的範圍；座標用 findTree 查（每個前綴檔只下載一次） */
export function useFog(): FogState {
  const checkins = useStore((s) => s.checkins)
  const ids = useMemo(() => exploredTreeIds(checkins), [checkins])
  const key = ids.join('|')
  const [resolved, setResolved] = useState<{ key: string; centers: LngLat[] }>({ key: '', centers: EMPTY })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!key) return
    let live = true
    setResolved((r) => (r.key === key ? { key: '', centers: EMPTY } : r)) // 重試時回到「正在整理」
    Promise.all(ids.map((id) => findTree(id))).then((trees) => {
      if (!live) return
      const coords = new Map<string, LngLat>()
      for (const t of trees) if (t) coords.set(t.id, t.lngLat)
      setResolved({ key, centers: clearedCenters(ids, coords) })
    })
    return () => {
      live = false
    }
    // ids 完全由 key 決定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const centers = key && resolved.key === key ? resolved.centers : EMPTY
  const stat = useMemo(() => fogStat(centers), [centers])
  const loading = !!key && resolved.key !== key
  const failed = !!key && !loading && centers.length === 0
  return { ...stat, centers, loading, failed, retry: () => setAttempt((n) => n + 1) }
}
