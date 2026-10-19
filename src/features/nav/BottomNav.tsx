import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconCompass, IconHollow, IconMapPin, IconPerson, IconScan, IconStamp } from '../../components/icons'
import { TABS, activeTab, centerAction, type TabId } from './tabs'
import { useScanHint } from './scanHint'

const ICON: Record<TabId, ReactNode> = {
  stamps: <IconStamp />,
  explore: <IconCompass />,
  home: <IconMapPin />,
  journal: <IconHollow />,
  me: <IconPerson />,
}

/**
 * 市民端底部導覽：5 個分頁。只顯示在分頁根頁面（見 TabLayout），沒有紅點或數字。
 * 中間是浮出的大按鈕：在首頁是「掃樹牌」（地圖上選了樹就帶著那棵樹），在其他分頁是「回首頁」。
 */
export function BottomNav() {
  const active = activeTab(useLocation().pathname)
  const hint = useScanHint()
  return (
    <nav className="bottom-nav" aria-label="主要" data-testid="bottom-nav">
      {TABS.map((t) => {
        if (t.id === 'home') {
          const c = centerAction(active)
          return (
            <Link
              key={t.id}
              to={c.to}
              state={c.kind === 'scan' && hint ? { hintTreeId: hint } : undefined}
              className={`bottom-tab bottom-cta ${c.kind}`}
              aria-label={c.kind === 'scan' ? '掃樹牌打卡' : '回首頁地圖'}
              data-testid="tab-home"
              data-action={c.kind}
            >
              <span className="cta-disc" aria-hidden>
                {c.kind === 'scan' ? <IconScan /> : <IconMapPin />}
              </span>
              <span>{c.label}</span>
            </Link>
          )
        }
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
