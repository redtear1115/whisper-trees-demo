import type { OrderStage } from '../vendor/orders'
import type { TreeReport, Wish, WishStatus } from '../../store/types'

export type ReviewStatus = 'open' | 'acknowledged' | 'dismissed'

export interface ReportReview {
  status: ReviewStatus
  at: number
  reason?: string
}

export interface DistrictStat {
  district: string
  trees_per_km: number
}

/** 閘道要的資料與寫入；正式接 store（storeData.ts），測試用記憶體版本 */
export interface DataSource {
  wishes(): Wish[]
  reports(): TreeReport[]
  orders(): Record<string, { stage: OrderStage; at: number; note?: string; hasPhoto?: boolean }>
  reviews(): Record<string, ReportReview>
  districts(): Promise<DistrictStat[]>
  setWishStatus(id: string, status: WishStatus, reason?: string): boolean
  setReview(reportId: string, review: ReportReview): void
  advanceOrder(orderId: string, stage: OrderStage, opts: { wishId?: string; note?: string }): void
}
