import { useState } from 'react'
import { TabHeader } from '../features/nav/TabLayout'
import { NearbyTrees } from '../features/journal/NearbyTrees'
import { DiaryList } from '../features/journal/DiaryList'
import { MyWishes } from './MyWishesPage'
import { Segmented, segmentedPanelProps } from '../components/Segmented'
import { useStore, useWishes } from '../store'
import { unseenWishUpdateCount } from '../features/wish/updates'

const TABS = [
  { value: 'diary', label: '我的日記', testId: 'journal-tab-diary' },
  { value: 'wishes', label: '許願', testId: 'journal-tab-wishes' },
] as const

/** 樹洞：我的日記／許願在上，附近的樹在下（走到樹旁就能留言，不用掃樹牌） */
export default function JournalPage() {
  const wishes = useWishes()
  const myWishIds = useStore((s) => s.myWishIds)
  const seen = useStore((s) => s.seen)
  const wishUpdates = unseenWishUpdateCount(wishes, myWishIds, seen)
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>(() => (wishUpdates > 0 ? 'wishes' : 'diary'))

  return (
    <div className="page">
      <TabHeader title="樹洞" />
      <p className="muted small">只有你看得到。想留話，先走到樹旁掃樹牌。</p>

      {wishUpdates > 0 && tab !== 'wishes' && (
        <button className="wish-update-banner" onClick={() => setTab('wishes')}>
          你的許願有 {wishUpdates} 筆新進度，點這裡查看
        </button>
      )}

      <div className="journal-tabs">
        <Segmented
          mode="tabs"
          idBase="journal"
          fill
          label="樹洞內容"
          testId="journal-tabs"
          options={TABS}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div {...segmentedPanelProps('journal', tab)} className="journal-panel">
        {tab === 'diary' ? <DiaryList /> : <MyWishes sub />}
      </div>

      <NearbyTrees />
    </div>
  )
}
