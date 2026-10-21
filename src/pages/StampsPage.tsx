import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TabHeader } from '../features/nav/TabLayout'
import { Art, Card, formatDate } from '../components/ui'
import { Segmented, segmentedPanelProps } from '../components/Segmented'
import { useOutline } from '../features/game/OutlineBackdrop'
import { StampAtlas } from '../features/stamps/StampAtlas'
import { ExploreSection } from '../features/stamps/ExploreSection'
import { stampsTabFromSearch, type StampsTab } from '../features/nav/redirects'
import { onboarding } from '../features/game/onboarding'
import { useStore, useWishes } from '../store'
import { baseLedger } from '../features/game/ledger'
import { earnedStampsNewestFirst, lightByDistrict, stampBook } from '../features/game/districts'

type View = 'map' | 'time'

const VIEW_OPTIONS = [
  { value: 'map', label: '地圖', testId: 'view-map' },
  { value: 'time', label: '依取得時間', testId: 'view-time' },
] as const

/** 集章冊：「集章」是各區的章與地圖，「探索」是迷霧地圖、新手任務與樹的圖鑑 */
export default function StampsPage() {
  const [params, setParams] = useSearchParams()
  const tab = stampsTabFromSearch(params.toString())
  const setTab = (t: StampsTab) => setParams(t === 'explore' ? { tab: 'explore' } : {}, { replace: true })

  const checkins = useStore((s) => s.checkins)
  const ledger = useStore((s) => baseLedger(s))
  const home = useStore((s) => onboarding(s).homeDistrict)
  const wishes = useWishes()
  const outline = useOutline()
  const [view, setView] = useState<View>('map')

  // 切換鈕在兩個位置之間搬家（地圖卡片頂端／依時間檢視的獨立一列），按完之後把焦點放回新的那顆，鍵盤與讀屏不會掉焦點
  const viewMounted = useRef(false)
  useEffect(() => {
    if (!viewMounted.current) {
      viewMounted.current = true
      return
    }
    document.querySelector<HTMLElement>(`[data-testid="view-${view}"]`)?.focus()
  }, [view])

  const book = useMemo(() => stampBook(checkins), [checkins])
  const light = useMemo(() => lightByDistrict(ledger, wishes), [ledger, wishes])
  const stamps = useMemo(() => earnedStampsNewestFirst(book), [book])

  const toggle = <Segmented<View> label="檢視方式" value={view} onChange={setView} options={VIEW_OPTIONS} />

  const intro = <p className="muted small stamps-intro">在各區的樹旁掃樹牌，每棵不同的樹算一次，不用急，哪一區先走都可以。</p>

  return (
    <div className="page stamps-page">
      <TabHeader title="集章冊" />
      <Segmented<StampsTab>
        fill
        mode="tabs"
        idBase="stamps-tab"
        label="集章冊的內容"
        testId="stamps-seg"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'stamps', label: '集章', testId: 'stamps-seg-stamps' },
          { value: 'explore', label: '探索', testId: 'stamps-seg-explore' },
        ]}
      />

      {tab === 'explore' ? (
        <div {...segmentedPanelProps('stamps-tab', 'explore')} className="stamps-panel" data-testid="explore-panel">
          <ExploreSection />
        </div>
      ) : (
        <div {...segmentedPanelProps('stamps-tab', 'stamps')} className="stamps-panel" data-testid="stamps-panel">
          {/* 切換鈕在「地圖」卡片的頂端（地圖之前，讀屏先遇到它），不浮在畫面上；
              已集到的章數併進「我的區」那一行（沒有我的區就在切換鈕旁）。依取得時間檢視沒有地圖，切換鈕與章數自成一列。 */}
          {/* 說明放在地圖下面：手機第一屏要留給「我的區」與地圖（見 08 §10） */}
          {view === 'time' && (
            <div className="atlas-head standalone" data-testid="atlas-head">
              {toggle}
              {stamps.length > 0 && (
                <span className="stamps-count">
                  已集 <strong data-testid="stamp-count">{stamps.length}</strong> 枚章
                </span>
              )}
            </div>
          )}
          {view === 'time' && intro}

          {view === 'map' ? (
            <StampAtlas book={book} light={light} checkins={checkins} homeDistrict={home} viewToggle={toggle} stampCount={stamps.length} outline={outline} />
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
          {view === 'map' && intro}
        </div>
      )}
    </div>
  )
}
