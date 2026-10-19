import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconCompass, IconHollow, IconMapPin, IconPerson, IconStamp } from '../../components/icons'
import { TABS, activeTab, type TabId } from './tabs'

const ICON: Record<TabId, ReactNode> = {
  stamps: <IconStamp />,
  explore: <IconCompass />,
  home: <IconMapPin />,
  journal: <IconHollow />,
  me: <IconPerson />,
}

/** 市民端底部導覽：5 個分頁。只顯示在分頁根頁面（見 TabLayout），沒有紅點或數字。 */
export function BottomNav() {
  const active = activeTab(useLocation().pathname)
  return (
    <nav className="bottom-nav" aria-label="主要" data-testid="bottom-nav">
      {TABS.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          className={`bottom-tab ${active === t.id ? 'on' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          data-testid={`tab-${t.id}`}
        >
          {ICON[t.id]}
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
