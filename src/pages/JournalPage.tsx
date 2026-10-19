import { useState } from 'react'
import { TabHeader } from '../features/nav/TabLayout'
import { NearbyTrees } from '../features/journal/NearbyTrees'
import { DiaryList } from '../features/journal/DiaryList'
import { MyWishes } from './MyWishesPage'

/** 樹洞：附近的樹（留言要先打卡）＋ 我的日記／我的許願 */
export default function JournalPage() {
  const [tab, setTab] = useState<'diary' | 'wishes'>('diary')

  return (
    <div className="page">
      <TabHeader title="樹洞" />
      <p className="muted small">只有你看得到。想留話，先走到樹旁掃樹牌。</p>

      <NearbyTrees />

      <div className="journal-tabs" role="tablist" data-testid="journal-tabs">
        <button role="tab" aria-selected={tab === 'diary'} data-testid="journal-tab-diary" onClick={() => setTab('diary')}>
          我的日記
        </button>
        <button role="tab" aria-selected={tab === 'wishes'} data-testid="journal-tab-wishes" onClick={() => setTab('wishes')}>
          我的許願
        </button>
      </div>

      {tab === 'diary' ? <DiaryList /> : <MyWishes sub />}
    </div>
  )
}
