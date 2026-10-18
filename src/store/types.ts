import type { LngLat } from '../lib/geo'
import type { Feasibility } from '../lib/score'

export type WishStatus = 'received' | 'surveying' | 'scheduled' | 'planted' | 'rejected'

export const STATUS_LABEL: Record<WishStatus, string> = {
  received: '已收件',
  surveying: '會勘中',
  scheduled: '可種・已排程',
  planted: '已種植',
  rejected: '不可種',
}

export const STATUS_FLOW: WishStatus[] = ['received', 'surveying', 'scheduled', 'planted']

export const WISH_REASONS = ['通學', '等公車', '太曬', '散步路線', '其他'] as const

export interface StatusEvent {
  status: WishStatus
  at: number
  reason?: string
}

export interface Wish {
  id: string
  pitId: string | null
  lngLat: LngLat
  road: string
  district: string
  reasons: string[]
  feasibility: Feasibility
  createdAt: number
  /** 模擬的既有澆水數 */
  seedWater: number
  /** 這台裝置上真實按下的澆水數 */
  water: number
  history: StatusEvent[]
  /** 預先放的示範資料 */
  mock: boolean
}

export interface Whisper {
  text: string
  at: number
  mock?: boolean
}

export interface Checkin {
  treeId: string
  result: 'success' | 'farView'
  at: number
}

export type ReportKind = '修剪問題' | '病蟲害' | '遮蔭過多或修剪過度' | '新長枝芽擋路' | '其他'

export interface TreeReport {
  id: string
  treeId: string
  road: string
  district: string
  kind: ReportKind
  note: string
  at: number
}
