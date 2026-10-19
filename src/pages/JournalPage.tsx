import { useState } from 'react'
import { TabHeader } from '../features/nav/TabLayout'
import { NearbyTrees } from '../features/journal/NearbyTrees'
import { DiaryList } from '../features/journal/DiaryList'
import { MyWishes } from './MyWishesPage'
import { Segmented, segmentedPanelProps } from '../components/Segmented'

const TABS = [
  { value: 'diary', label: '我的日記', testId: 'journal-tab-diary' },
  { value: 'wishes', label: '我的許願', testId: 'journal-tab-wishes' },
] as const

/** 樹洞：我的日記／我的許願在上，附近的樹在下（留言要先走到樹旁、再掃樹牌打卡） */
export default function JournalPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('diary')

  return (
    <div className="page">
      <TabHeader title="樹洞" />
      <p className="muted small">只有你看得到。想留話，先走到樹旁掃樹牌。</p>

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
