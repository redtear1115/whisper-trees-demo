import type { ReactNode } from 'react'
import { assetUrl } from '../assets'
import { formatDay } from '../lib/datetime'

/** 模擬資料的小標籤 */
export function MockTag({ title }: { title?: string }) {
  return (
    <span className="mock-tag" title={title ?? '這是示範用的模擬資料'}>
      模擬
    </span>
  )
}

/** 美術佔位圖；設計交件後替換同名檔案 */
export function Art({ id, alt, className }: { id: string; alt: string; className?: string }) {
  return <img className={`art ${className ?? ''}`} src={assetUrl(id)} alt={alt} />
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className ?? ''}`}>{children}</section>
}

/** 日期：全站同一種寫法（見 src/lib/datetime.ts） */
export function formatDate(at: number): string {
  return formatDay(at)
}

export function relativeDays(at: number): string {
  const days = Math.round((Date.now() - at) / 86_400_000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days >= 360 && days <= 370) return '一年前的今天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.round(days / 30)} 個月前`
  return `${Math.round(days / 365)} 年前`
}
