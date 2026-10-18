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
  /** 圖鑑用；舊資料可能沒有 */
  species?: string
  night?: boolean
}

export type ReportKind = 'pruning' | 'sick'

export const REPORT_KINDS: Record<ReportKind, { label: string; details: string[] }> = {
  pruning: { label: '修剪有問題', details: ['修剪過度', '遮蔭過多', '枝葉擋路'] },
  sick: { label: '樹木生病', details: ['病蟲害', '枯枝或落枝', '樹幹傾斜或受損'] },
}

export interface TreeReport {
  id: string
  treeId: string
  species: string
  road: string
  district: string
  kind: ReportKind
  details: string[]
  note: string
  /** 有附照片（照片本身只在本機預覽，不存） */
  hasPhoto: boolean
  at: number
  mock?: boolean
}
