import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { IconBack } from '../components/icons'
import { Art, Card, MockTag, formatDate } from '../components/ui'
import { useStore } from '../store'
import { useBalance, useEarned, useLedger } from '../features/game/ledger'
import { stageOf } from '../features/game/character'
import { badges } from '../features/game/badges'
import { equip, useInventory } from '../features/game/inventory'
import { useGameConfig } from '../features/game/config'
import { TasksCard } from '../features/onboarding/TasksCard'
import { useViewedFlag } from '../features/onboarding/viewed'
import { EventBar } from '../features/game/EventBar'

export default function MePage() {
  const balance = useBalance()
  const earned = useEarned()
  const ledger = useLedger()
  const inv = useInventory()
  const cfg = useGameConfig()
  const state = useStore((s) => s)
  const badgesRef = useRef<HTMLDetailsElement>(null)
  useViewedFlag('viewedBadgesAt', badgesRef)
  const { stage, next, progress } = stageOf(earned)
  const list = badges(state)
  const outfit = cfg.shop.find((i) => i.id === inv.equipped.outfit)
  const ownedOutfits = cfg.shop.filter((i) => i.kind === 'outfit' && inv.owned.includes(i.id))
  const ownedFrames = cfg.shop.filter((i) => i.kind === 'frame' && inv.owned.includes(i.id))

  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/">
          <IconBack /> 地圖
        </Link>
        <span className="topbar-title">我的小芽</span>
        <MockTag title="光點、角色、徽章都存在你的裝置上，是示意功能" />
      </header>
      <EventBar />

      <Card>
        <div className="character">
          <div className="stack">
            <Art id={stage.art} alt={`小芽：${stage.name}`} />
            {outfit && <Art id={outfit.art} alt={outfit.name} className="outfit" />}
          </div>
          <div>
            <h2>
              小芽・{stage.name}
            </h2>
            <p className="balance-chip">
              <Art id="glow" alt="" className="icon sm" /> {balance} 光點
            </p>
            {next ? (
              <>
                <div className="bar" aria-label={`再 ${next.min - earned} 光點長成${next.name}`}>
                  <div style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="muted small">
                  再 {next.min - earned} 光點長成「{next.name}」（累計獲得 {earned}，花掉不會變小）
                </p>
              </>
            ) : (
              <p className="muted small">已經長成大樹了。累計獲得 {earned} 光點。</p>
            )}
          </div>
        </div>
        <div className="row gap" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="btn small" to="/shop">
            商店
          </Link>
          <Link className="btn small" to="/codex">
            圖鑑
          </Link>
        </div>
      </Card>

      <TasksCard />

      {(ownedOutfits.length > 0 || ownedFrames.length > 0) && (
        <Card>
          <h2>換裝</h2>
          <div className="chips">
            <button className={`chip ${!inv.equipped.outfit ? 'on' : ''}`} onClick={() => equip('outfit', undefined)}>
              不穿戴
            </button>
            {ownedOutfits.map((i) => (
              <button
                key={i.id}
                className={`chip ${inv.equipped.outfit === i.id ? 'on' : ''}`}
                onClick={() => equip('outfit', i.id)}
              >
                {i.name}
              </button>
            ))}
          </div>
          {ownedFrames.length > 0 && (
            <div className="chips">
              <button className={`chip ${!inv.equipped.frame ? 'on' : ''}`} onClick={() => equip('frame', undefined)}>
                無相框
              </button>
              {ownedFrames.map((i) => (
                <button
                  key={i.id}
                  className={`chip ${inv.equipped.frame === i.id ? 'on' : ''}`}
                  onClick={() => equip('frame', i.id)}
                >
                  {i.name}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <h2 className="section-title">光點紀錄</h2>
      <Card>
        {ledger.length === 0 ? (
          <p className="muted">還沒有光點。到樹旁掃樹牌，就會有第一道光。</p>
        ) : (
          <ul className="ledger">
            {[...ledger].reverse().map((e, i) => (
              <li key={i}>
                <span>
                  {e.reason}
                  <span className="muted small">・{formatDate(e.at)}</span>
                </span>
                <span className={e.delta > 0 ? 'plus' : 'minus'}>
                  {e.delta > 0 ? '+' : ''}
                  {e.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <details className="about badges" ref={badgesRef} data-testid="badges-section">
        <summary>
          成長徽章 <span className="muted small">已得到 {list.filter((b) => b.earned).length} / {list.length}，不用急</span>
        </summary>
        <div className="grid-cards">
          {list.map((b) => (
            <div key={b.id} className={`tile ${b.earned ? '' : 'locked'}`}>
              <Art id={b.art} alt="" />
              <strong>{b.name}</strong>
              <span className="small muted">{b.hint}</span>
            </div>
          ))}
        </div>
      </details>

      <p className="muted small">光點只能在樹旁或幫城市得到，不能用錢買。沒有排行榜，也不用每天來。</p>
    </div>
  )
}
