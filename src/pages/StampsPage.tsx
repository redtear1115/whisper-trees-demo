import { useMemo, useState } from 'react'
import { TabHeader } from '../features/nav/TabLayout'
import { Art, Card, formatDate } from '../components/ui'
import { StampAtlas } from '../features/stamps/StampAtlas'
import { useStore, useWishes } from '../store'
import { baseLedger } from '../features/game/ledger'
import { earnedStampsNewestFirst, lightByDistrict, stampBook } from '../features/game/districts'

type View = 'map' | 'time'

export default function StampsPage() {
  const checkins = useStore((s) => s.checkins)
  const ledger = useStore((s) => baseLedger(s))
  const wishes = useWishes()
  const [view, setView] = useState<View>('map')

  const book = useMemo(() => stampBook(checkins), [checkins])
  const light = useMemo(() => lightByDistrict(ledger, wishes), [ledger, wishes])
  const stamps = useMemo(() => earnedStampsNewestFirst(book), [book])

  return (
    <div className="page">
      <TabHeader title="集章冊" />
      <p>
        在各區的樹旁掃樹牌，每棵不同的樹算一次。已集到 <strong data-testid="stamp-count">{stamps.length}</strong> 枚章。
      </p>
      <p className="muted small">不用急，哪一區先走、走多少都可以。章的圖案是佔位美術。</p>

      <div className="segmented" role="group" aria-label="檢視方式">
        <button className={view === 'map' ? 'on' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')} data-testid="view-map">
          地圖
        </button>
        <button className={view === 'time' ? 'on' : ''} aria-pressed={view === 'time'} onClick={() => setView('time')} data-testid="view-time">
          依取得時間
        </button>
      </div>

      {view === 'map' ? (
        <StampAtlas book={book} light={light} checkins={checkins} />
      ) : stamps.length === 0 ? (
        <p className="muted" data-testid="stamp-list-empty">
          還沒有章。到樹旁掃樹牌，第一枚鐵章就會出現在這裡。
        </p>
      ) : (
        <Card>
          <ul className="stamp-list" data-testid="stamp-list">
            {stamps.map((e) => (
              <li key={`${e.district}-${e.tier.id}`} data-testid="stamp-item" data-district={e.district} data-tier={e.tier.id}>
                <Art id={e.tier.art} alt="" className="icon" />
                <span>
                  <strong>
                    {e.district}・{e.tier.name}
                  </strong>
                  <br />
                  <span className="muted small">{formatDate(e.earnedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
