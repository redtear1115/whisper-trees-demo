import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconHollow, IconMapPin, IconPerson, IconScan, IconStamp } from '../../components/icons'
import { NAV_SLOTS, TABS, activeTab, centerAction, scanState, type TabId } from './tabs'
import { useScanHint } from './scanHint'

const ICON: Record<TabId, ReactNode> = {
  home: <IconMapPin />,
  stamps: <IconStamp />,
  journal: <IconHollow />,
  me: <IconPerson />,
}

/**
 * 市民端底部導覽：首頁・集章冊・［掃樹牌］・樹洞・我的。只顯示在分頁根頁面（見 TabLayout），沒有紅點或數字。
 * 中間浮出的大按鈕在每個分頁都是「掃樹牌」；在首頁、地圖上選了樹時，帶著那棵樹去掃描頁。
 */
export function BottomNav() {
  const active = activeTab(useLocation().pathname)
  const hint = useScanHint()
  return (
    <nav className="bottom-nav" aria-label="主要" data-testid="bottom-nav">
      {NAV_SLOTS.map((slot) => {
        if (slot === 'scan') {
          const c = centerAction()
          return (
            <Link key="scan" to={c.to} state={scanState(active, hint)} className="bottom-tab bottom-cta scan" aria-label="掃樹牌打卡" data-testid="tab-scan">
              <span className="cta-disc" aria-hidden>
                <IconScan />
              </span>
              <span>{c.label}</span>
            </Link>
          )
        }
        const t = TABS.find((x) => x.id === slot)!
        return (
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
        )
      })}
    </nav>
  )
}
