import { useRef } from 'react'
import { Art } from '../../components/ui'
import { useStore } from '../../store'
import { badgeSummary, badges } from '../game/badges'
import { useViewedFlag } from '../onboarding/viewed'

/**
 * 成長徽章：收合時就說「已得到幾枚、為什麼」；展開看全部，一枚一列（左邊小圖、右邊名稱與說明，規格 08 §4），
 * 得到的寫你做了什麼，沒得到的寫怎麼做。標題是 h2（在 summary 裡），用標題跳讀也找得到。
 */
export function BadgesSection() {
  const state = useStore((s) => s)
  const ref = useRef<HTMLDetailsElement>(null)
  useViewedFlag('viewedBadgesAt', ref)
  const list = badges(state)
  const got = list.filter((b) => b.earned).length
  return (
    <details className="about badges me-badges" ref={ref} data-testid="badges-section">
      <summary>
        <span className="me-badges-head">
          <h2 className="me-badges-title">成長徽章</h2>
          <span className="muted small" data-testid="badges-summary">
            已得到 {got}／{list.length}・{badgeSummary(list)}
          </span>
        </span>
      </summary>
      <ul className="me-badge-list">
        {list.map((b) => (
          <li key={b.id} className={`me-badge ${b.earned ? 'earned' : 'locked'}`} data-testid={`badge-${b.id}`}>
            <Art id={b.art} alt="" className="me-badge-art" />
            <span className="me-badge-text">
              <strong>{b.name}</strong>
              <span className="small muted">{b.earned ? b.note : `還沒得到・${b.hint}`}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
