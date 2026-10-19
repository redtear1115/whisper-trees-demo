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

/** 台北 12 個行政區；Firestore 規則也只接受這些 */
export const TAIPEI_DISTRICTS = [
  '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
  '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區',
] as const

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

/**
 * 樹況回報五個類別（團隊簡報 v17 第 22 頁）：一鍵選類別，不再選細項。
 * `pruning` 這個 id 沿用舊值，語意是「樹木修剪問題」。
 */
export type ReportKind = 'pruning' | 'pest' | 'shade' | 'sprout' | 'other'

export const REPORT_KINDS: Record<ReportKind, { label: string }> = {
  pruning: { label: '樹木修剪問題' },
  pest: { label: '病蟲害' },
  shade: { label: '遮蔭太多，或修剪過度' },
  sprout: { label: '新長枝芽擋路' },
  other: { label: '其他' },
}

/** 舊版（2026-10-20 前）回報的細項。只用來讀舊資料與搬舊的本機回報，新的回報不再選細項。 */
export const LEGACY_REPORT_DETAILS = ['修剪過度', '遮蔭過多', '枝葉擋路', '病蟲害', '枯枝或落枝', '樹幹傾斜或受損']

/**
 * 把舊資料的類別換成新的五類（舊：`pruning` 修剪有問題、`sick` 樹木生病，各有細項）。
 * 新的 id 原樣通過；不認得的一律歸「其他」。純函式，讀資料時用，不改已存的文件。
 */
export function normalizeReportKind(kind: string, details: readonly string[] = []): ReportKind {
  if (kind in REPORT_KINDS && kind !== 'pruning') return kind as ReportKind
  if (kind === 'pruning') {
    if (details.includes('修剪過度') || details.includes('遮蔭過多')) return 'shade'
    if (details.includes('枝葉擋路')) return 'sprout'
    return 'pruning'
  }
  if (kind === 'sick') return details.includes('病蟲害') ? 'pest' : 'other'
  return 'other'
}

export interface TreeReport {
  id: string
  treeId: string
  species: string
  road: string
  district: string
  kind: ReportKind
  /** 只有舊回報有（見 LEGACY_REPORT_DETAILS）；新回報一律是空陣列 */
  details: string[]
  note: string
  /** 有附照片（照片本身只在本機預覽，不存） */
  hasPhoto: boolean
  at: number
  mock?: boolean
  /** 雲端模式：這筆是不是自己送的（本機模式的回報都是自己的，沒有這個欄位） */
  mine?: boolean
}
