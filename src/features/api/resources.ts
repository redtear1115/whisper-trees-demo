// 把 store 的資料轉成 API 回應的形狀（欄位用 snake_case、時間用 ISO 8601）。

import { DEFAULT_WEIGHTS, scoreAll, type ScoreParts, type Weights } from '../../lib/score'
import { REPORT_KINDS, STATUS_LABEL, type TreeReport, type Wish, type WishStatus } from '../../store/types'
import type { OrderStage } from '../vendor/orders'
import type { DataSource, DistrictStat, ReportReview } from './types'
import { vendorOfDistrict } from './vendors'

const iso = (ms: number) => new Date(ms).toISOString()
// 與 store 的 wishStatus / totalWater 同義；這裡不 import store，閘道邏輯才能單獨測試
const wishStatus = (w: Wish): WishStatus => w.history[w.history.length - 1].status
const totalWater = (w: Wish) => w.seedWater + w.water

export const CLOSED: WishStatus[] = ['planted', 'rejected']

export function caseResource(w: Wish) {
  const last = w.history[w.history.length - 1]
  return {
    id: w.id,
    pit_id: w.pitId,
    location: { lng: w.lngLat[0], lat: w.lngLat[1] },
    road: w.road,
    district: w.district,
    reasons: w.reasons,
    feasibility: w.feasibility,
    waterings: totalWater(w),
    status: last.status,
    status_label: STATUS_LABEL[last.status],
    ...(last.reason ? { status_reason: last.reason } : {}),
    created_at: iso(w.createdAt),
    updated_at: iso(last.at),
    source: w.mock ? 'mock' : 'citizen',
  }
}

export function caseDetail(w: Wish, scoreOf?: ScoreParts) {
  return {
    ...caseResource(w),
    history: w.history.map((e) => ({
      status: e.status,
      status_label: STATUS_LABEL[e.status],
      at: iso(e.at),
      ...(e.reason ? { reason: e.reason } : {}),
    })),
    ...(scoreOf ? { score: scoreBody(scoreOf) } : {}),
  }
}

const pct = (n: number) => Math.round(n * 1000) / 10

function scoreBody(s: ScoreParts) {
  return { total: pct(s.total), demand: s.demand, shade: s.shade, feasibility: s.feasibility, fairness: s.fairness }
}

export async function scoreCases(data: DataSource, weights: Weights): Promise<Map<string, ScoreParts>> {
  const districts: DistrictStat[] = await data.districts()
  const perKm = new Map(districts.map((d) => [d.district, d.trees_per_km]))
  const all = districts.map((d) => d.trees_per_km)
  const wishes = data.wishes()
  const scores = scoreAll(
    wishes.map((w) => ({
      waterings: totalWater(w),
      treesPerKm: perKm.get(w.district) ?? Math.min(...all),
      feasibility: w.feasibility,
    })),
    weights,
    all,
  )
  return new Map(wishes.map((w, i) => [w.id, scores[i]]))
}

export function normalizedWeights(w: Weights): Weights {
  const sum = w.demand + w.shade + w.feasibility + w.fairness
  if (!sum) return { demand: 0, shade: 0, feasibility: 0, fairness: 0 }
  const f = (n: number) => Math.round((n / sum) * 1000) / 10
  return { demand: f(w.demand), shade: f(w.shade), feasibility: f(w.feasibility), fairness: f(w.fairness) }
}

export { DEFAULT_WEIGHTS }

export function hotspots(wishes: Wish[]) {
  const groups = new Map<string, Wish[]>()
  for (const w of wishes) {
    if (CLOSED.includes(wishStatus(w))) continue
    const k = `${w.district}|${w.road}`
    groups.set(k, [...(groups.get(k) ?? []), w])
  }
  return [...groups.values()]
    .map((list) => {
      const reasons: Record<string, number> = {}
      for (const w of list) for (const r of w.reasons) reasons[r] = (reasons[r] ?? 0) + 1
      const waterings = list.reduce((n, w) => n + totalWater(w), 0)
      const lng = list.reduce((n, w) => n + w.lngLat[0], 0) / list.length
      const lat = list.reduce((n, w) => n + w.lngLat[1], 0) / list.length
      return {
        road: list[0].road,
        district: list[0].district,
        open_cases: list.length,
        waterings,
        reasons,
        centroid: { lng: Math.round(lng * 1e5) / 1e5, lat: Math.round(lat * 1e5) / 1e5 },
        case_ids: list.map((w) => w.id),
      }
    })
    .sort((a, b) => b.waterings - a.waterings || a.road.localeCompare(b.road))
}

export function reportResource(r: TreeReport, review: ReportReview | undefined, orderStage: OrderStage | undefined) {
  return {
    id: r.id,
    tree_id: r.treeId,
    species: r.species,
    road: r.road,
    district: r.district,
    kind: r.kind,
    kind_label: REPORT_KINDS[r.kind].label,
    details: r.details,
    note: r.note,
    has_photo: r.hasPhoto,
    reported_at: iso(r.at),
    review_status: review?.status ?? 'open',
    ...(review?.reason ? { review_reason: review.reason } : {}),
    work_order_id: `wo_report_${r.id}`,
    work_order_status: workOrderStatus(orderStage ?? 'new'),
  }
}

// ---------- 工單 ----------

export type WorkOrderStatus = 'pending' | 'accepted' | 'in_progress' | 'done'

export const STAGE_TO_STATUS: Record<OrderStage, WorkOrderStatus> = {
  new: 'pending',
  accepted: 'accepted',
  working: 'in_progress',
  done: 'done',
}
export const workOrderStatus = (s: OrderStage): WorkOrderStatus => STAGE_TO_STATUS[s]

export interface WorkOrderRow {
  id: string
  type: 'planting' | 'care'
  orderKey: string
  wishId?: string
  reportId?: string
  district: string
  road: string
  title: string
  stage: OrderStage
  updatedAt?: number
  note?: string
  vendorId: string
}

/** 與 /vendor 頁同一套規則：排程中或已有工單紀錄的補種案件，加上全部樹況回報 */
export function workOrderRows(data: DataSource): WorkOrderRow[] {
  const orders = data.orders()
  const rows: WorkOrderRow[] = []
  for (const w of data.wishes()) {
    const key = `wish:${w.id}`
    if (wishStatus(w) !== 'scheduled' && !orders[key]) continue
    rows.push({
      id: `wo_wish_${w.id}`,
      type: 'planting',
      orderKey: key,
      wishId: w.id,
      district: w.district,
      road: w.road,
      title: `補種：${w.district} ${w.road}`,
      stage: orders[key]?.stage ?? 'new',
      updatedAt: orders[key]?.at,
      note: orders[key]?.note,
      vendorId: vendorOfDistrict(w.district).id,
    })
  }
  for (const r of data.reports()) {
    const key = `report:${r.id}`
    rows.push({
      id: `wo_report_${r.id}`,
      type: 'care',
      orderKey: key,
      reportId: r.id,
      district: r.district,
      road: r.road,
      title: `養護：${r.district} ${r.road}・${r.species}（${r.treeId}）`,
      stage: orders[key]?.stage ?? 'new',
      updatedAt: orders[key]?.at,
      note: orders[key]?.note,
      vendorId: vendorOfDistrict(r.district).id,
    })
  }
  return rows
}

export function workOrderResource(row: WorkOrderRow, vendorName: string) {
  return {
    id: row.id,
    type: row.type,
    ...(row.wishId ? { case_id: row.wishId } : {}),
    ...(row.reportId ? { report_id: row.reportId } : {}),
    title: row.title,
    district: row.district,
    road: row.road,
    status: workOrderStatus(row.stage),
    vendor_id: row.vendorId,
    vendor_name: vendorName,
    ...(row.updatedAt ? { updated_at: iso(row.updatedAt) } : {}),
    ...(row.note ? { completion_note: row.note } : {}),
  }
}
