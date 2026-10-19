import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { BalanceChip } from './BalanceChip'

/** 分頁根頁面的外框：頁面內容 + 底部導覽。內容底部留出導覽的高度（見 .tab-shell）。 */
export function TabLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tab-shell">
      {children}
      <BottomNav />
    </div>
  )
}

/** 分頁頁面的頁首：標題在左，光點餘額在右上 */
export function TabHeader({ title }: { title: string }) {
  return (
    <header className="topbar tab-top">
      <h1 className="topbar-title">{title}</h1>
      <BalanceChip />
    </header>
  )
}
