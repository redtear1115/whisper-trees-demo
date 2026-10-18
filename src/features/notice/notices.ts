// 移樹前公告（模擬）：回應「誤砍茄苳」事件——動一棵樹之前，先讓附近的人知道、有機會表示意見。

import notices from '../../mock/notices.json'
import { getExt, setExt, useStore } from '../../store'

export interface Notice {
  id: string
  treeId: string
  species: string
  place: string
  action: string
  date: string
  reason: string
  postedDaysAgo: number
  /** 模擬的既有意見數 */
  opinions: number
}

export const NOTICES = notices as Notice[]

export function noticeFor(treeId: string): Notice | undefined {
  return NOTICES.find((n) => n.treeId === treeId)
}

const NONE: Record<string, string> = {}

/** 這台裝置對公告留下的意見（只有一句，送到政府端彙整） */
export function useMyOpinions() {
  return useStore((s) => getExt<Record<string, string>>('opinions', NONE, s))
}

export function addOpinion(noticeId: string, text: string) {
  const t = text.trim().slice(0, 140)
  if (!t) return
  setExt('opinions', { ...getExt<Record<string, string>>('opinions', NONE), [noticeId]: t })
}
