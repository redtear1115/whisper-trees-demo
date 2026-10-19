// 發包商工單：補種（政府端排程的許願）與養護（樹況回報）。存在 store 的 ext.vendor。

import { getExt, saveOrder, useStore, type State } from '../../store'

export type OrderStage = 'new' | 'accepted' | 'working' | 'done'

export const STAGE_LABEL: Record<OrderStage, string> = {
  new: '待接單',
  accepted: '已接單',
  working: '施工中',
  done: '已完工',
}

export interface OrderState {
  stage: OrderStage
  at: number
  note?: string
  hasPhoto?: boolean
}

type Orders = Record<string, OrderState>

const NONE: Orders = {}

export function orders(s?: State): Orders {
  return getExt<Orders>('vendor', NONE, s)
}

export function useOrders() {
  return useStore((s) => orders(s))
}

export function stageOf(id: string, o: Orders): OrderStage {
  return o[id]?.stage ?? 'new'
}

/** 推進工單；補種工單完工時，許願狀態改為「已種植」 */
export function advance(
  id: string,
  stage: OrderStage,
  opts: { wishId?: string; note?: string; hasPhoto?: boolean } = {},
) {
  saveOrder(id, { stage, at: Date.now(), note: opts.note, hasPhoto: opts.hasPhoto }, stage === 'done' ? opts.wishId : undefined)
}

/** 樹況回報是否已由廠商處理完 */
export function reportResolved(reportId: string, o: Orders): boolean {
  return o[`report:${reportId}`]?.stage === 'done'
}
