import { useEffect, useMemo, useState } from 'react'
import { findTree } from '../../lib/trees'
import type { LngLat } from '../../lib/geo'
import { useStore } from '../../store'
import { clearedCenters, exploredTreeIds, fogStat, type FogStat } from './fog'

export interface FogState extends FogStat {
  centers: LngLat[]
  /** 座標還在查的時候是 true */
  loading: boolean
}

const EMPTY: LngLat[] = []

/** 依自己的打卡紀錄算出清出的範圍；座標用 findTree 查（每個前綴檔只下載一次） */
export function useFog(): FogState {
  const checkins = useStore((s) => s.checkins)
  const ids = useMemo(() => exploredTreeIds(checkins), [checkins])
  const key = ids.join('|')
  const [resolved, setResolved] = useState<{ key: string; centers: LngLat[] }>({ key: '', centers: EMPTY })

  useEffect(() => {
    if (!key) return
    let live = true
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
  }, [key])

  const centers = key && resolved.key === key ? resolved.centers : EMPTY
  const stat = useMemo(() => fogStat(centers), [centers])
  return { ...stat, centers, loading: !!key && resolved.key !== key }
}
