import { useRef } from 'react'
import { Art } from '../../components/ui'
import { useStore } from '../../store'
import { badgeSummary, badges } from '../game/badges'
import { useViewedFlag } from '../onboarding/viewed'

/** 成長徽章：收合時就說「已得到幾枚、為什麼」；展開看全部，得到的寫你做了什麼，沒得到的寫怎麼做 */
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
          <span>成長徽章</span>
          <span className="muted small" data-testid="badges-summary">
            已得到 {got}／{list.length}・{badgeSummary(list)}
          </span>
        </span>
      </summary>
      <div className="grid-cards">
        {list.map((b) => (
          <div key={b.id} className={`tile ${b.earned ? 'earned' : 'locked'}`}>
            <Art id={b.art} alt="" />
            <strong>{b.name}</strong>
            <span className="small muted">{b.earned ? b.note : `還沒得到・${b.hint}`}</span>
          </div>
        ))}
      </div>
    </details>
  )
}
