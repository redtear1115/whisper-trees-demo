import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Tree } from '../../lib/trees'
import { recentCheckin, useStore, whispersOf } from '../../store'
import { formatDate, relativeDays } from '../../components/ui'
import { IconCapsule } from '../../components/icons'
import { InteractionMood } from '../journal/InteractionMood'
import { ReportBox } from '../report/ReportBox'
import { TreeFacts } from '../tree/TreeFacts'
import { WhisperBox } from '../whisper/WhisperBox'

// 拉近畫面裡的卡片（2026-10-21 第二版，使用者決定「點了就開卡，不換頁」）：留言在樹洞、回報、樹的資料。
// 摸摸樹的卡是 ../touch/TouchPanel（在感應圈內就打得開，不用掃樹牌）。留言、回報的卡只有打過卡才打得開（拉近畫面擋著），所以這裡都當作在現場。

/** 留言在樹洞：和樹的頁面同一個樹洞（WhisperBox），下面是時空膠囊（上次說的話，或示範） */
export function WhisperCard({ treeId }: { treeId: string }) {
  const checkins = useStore((s) => s.checkins)
  const mine = useStore((s) => s.whispers[treeId])
  const sessionStart = useMemo(() => recentCheckin(treeId)?.at ?? Date.now(), [treeId, checkins])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const whispers = useMemo(() => whispersOf(treeId), [treeId, mine])
  const thisVisit = whispers.filter((w) => w.at >= sessionStart && !w.mock)
  const lastAt = thisVisit.length ? thisVisit[thisVisit.length - 1].at : null
  const capsule = whispers.find((w) => w.at < sessionStart)
  return (
    <div className="focus-card-body" data-testid="focus-card-whisper">
      <WhisperBox
        treeId={treeId}
        said={thisVisit.map((w) => w.text)}
        mood={(open) => (lastAt !== null ? <InteractionMood kind="whisper" treeId={treeId} at={lastAt} open={open} /> : null)}
      />
      {capsule && (
        <section className="capsule" aria-label="時空膠囊">
          <span className="ornament" aria-hidden>
            <IconCapsule />
          </span>
          <div>
            <p className="capsule-when">
              {capsule.mock ? '示範：一年後回到這棵樹，會看到當時說的話' : `上次你在這裡說了…… ${relativeDays(capsule.at)}`}
              <span className="muted">（{formatDate(capsule.at)}）</span>
            </p>
            <p className="capsule-text">「{capsule.text}」</p>
          </div>
        </section>
      )}
    </div>
  )
}

/** 回報：先看一眼樹的資料，下面直接是展開的回報表單；「取消」收起整張卡 */
export function ReportCard({ tree, onClose }: { tree: Tree; onClose: () => void }) {
  return (
    <div className="focus-card-body" data-testid="focus-card-report">
      <h2 className="focus-card-title">樹的資料</h2>
      <TreeFacts tree={tree} />
      <ReportBox tree={tree} onSite openForm onCancel={onClose} />
    </div>
  )
}

/** 樹的資料：開放資料的欄位，最下面可以打開完整的樹的頁面（照片、微光、樹洞都在那裡） */
export function InfoCard({ tree }: { tree: Tree }) {
  return (
    <div className="focus-card-body" data-testid="focus-card-info">
      <h2 className="focus-card-title">樹的資料</h2>
      <TreeFacts tree={tree} />
      <Link className="btn block" to={`/tree/${tree.id}`} data-testid="focus-open-page">
        打開這棵樹的頁面
      </Link>
    </div>
  )
}
