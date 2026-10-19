import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Art, formatDate } from '../../components/ui'
import { ACTION_LABEL } from '../game/config'
import { progressText, type DistrictLedger, type DistrictStamps } from '../game/districts'
import { toneOf } from './colors'
import { WAITING_INVITATION, isWaiting } from './home'

/** 全市地圖點了一區之後的狀態卡：章、進度、光點、光點明細，還有「進入里地圖」。 */
export function DistrictCard({
  b,
  light,
  onEnter,
}: {
  b: DistrictStamps
  light: DistrictLedger | undefined
  onEnter: () => void
}) {
  const [open, setOpen] = useState(false)
  const items = light?.items ?? []
  const tone = toneOf(b.top?.id)

  const ledgerBlock = (
  <details className="about" onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary data-testid="district-ledger-toggle">這一區的光點紀錄（{items.length} 筆）</summary>
          {open &&
            (items.length === 0 ? (
              <p className="muted small">還沒有。到這一區的樹旁掃樹牌，光點就會記在這裡。</p>
            ) : (
              <ul className="ledger" data-testid="district-ledger">
                {items.map((i, n) => (
                  <li key={n}>
                    <span>
                      {i.treeId ? (
                        <Link className="mono" to={`/tree/${i.treeId}`} state={{ from: '/stamps' }}>
                          {i.treeId}
                        </Link>
                      ) : (
                        <>許願路：{i.wishRoad ?? '（未命名）'}</>
                      )}
                      ・{ACTION_LABEL[i.action]}
                      <span className="muted small">・{formatDate(i.at)}</span>
                    </span>
                    <span className="plus">+{i.delta}</span>
                  </li>
                ))}
              </ul>
            ))}
        </details>
  )

  // 一棵都還沒打卡：不排一整排 0，是一張邀請——走到樹旁掃樹牌，蓋第一個章
  if (isWaiting(b))
    return (
      <section className="atlas-card waiting" aria-label={`${b.district}集章`} data-testid="district-detail" data-district={b.district} data-waiting="true">
        <h2 tabIndex={-1} data-reveal-heading>
          {b.district}
        </h2>
        <div className="stamp-waiting">
          <span className="stamp-ghost" aria-hidden="true" />
          <p data-testid="district-invitation">{WAITING_INVITATION}</p>
        </div>
        <Link className="btn primary block" to="/scan" data-testid="district-scan">
          去掃樹牌
        </Link>
        <button type="button" className="btn block" onClick={onEnter} data-testid="enter-villages">
          進入里地圖
        </button>
        {items.length > 0 && ledgerBlock}
      </section>
    )

  return (
    <section className="atlas-card" aria-label={`${b.district}集章`} data-testid="district-detail" data-district={b.district}>
      <h2 tabIndex={-1} data-reveal-heading>
        <i className="atlas-dot" style={{ background: tone.fill }} aria-hidden="true" />
        {b.district}
        <span className="atlas-tier">{b.top ? b.top.name : '未開始'}</span>
      </h2>
      <p className="atlas-big">
        <strong data-testid="district-count">{b.distinct}</strong> 棵不同的樹
      </p>
      <div className="stamp-tiers">
        {b.earned.length === 0 && <span className="muted small">還沒有章</span>}
        {b.earned.map((e) => (
          <span key={e.tier.id} className="stamp-tier" data-testid={`tier-${e.tier.id}`}>
            <Art id={e.tier.art} alt={e.tier.name} className="icon" />
            <span className="small">{formatDate(e.earnedAt)}</span>
          </span>
        ))}
      </div>
      <p data-testid="district-progress">{progressText(b)}</p>
      <div className="bar" aria-hidden>
        <div style={{ width: `${b.next ? Math.min(100, (b.distinct / b.next.min) * 100) : 100}%` }} />
      </div>
      <p className="muted small">不同的樹各算一次，同一棵樹再來不會多算。</p>
      <p>
        這一區收集的光點：<strong data-testid="district-light-total">{light?.total ?? 0}</strong>
      </p>
      <button type="button" className="btn primary block" onClick={onEnter} data-testid="enter-villages">
        進入里地圖
      </button>
      {ledgerBlock}
      <p className="muted small">只統計「在這一區的樹或許願」得到的光點；花掉的光點和客服補發不列在這裡。</p>
    </section>
  )
}
