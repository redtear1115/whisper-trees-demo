import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Scanner } from '../features/checkin/Scanner'
import { parseTreeId } from '../lib/treeId'
import { findTree, type Tree } from '../lib/trees'
import { judgeCheckin, type CheckinResult } from '../lib/geo'
import { currentDemoPosition } from '../lib/demoPosition'
import { locate } from '../lib/locate'
import { DATA_VERSION } from '../config'
import { getState, isDemoMode, recordCheckin } from '../store'
import { whenUserReady } from '../store/session'
import { dayKey } from '../lib/seed'
import { awardCheckin, isDaytime } from '../features/game/ledger'
import { loadProtectedTrees } from '../features/game/protectedTrees'
import { checkinDrops, type CheckinDrops } from '../features/game/drops'
import { SCAN_CLOSE_TO } from '../features/nav/tabs'

type Step = { kind: 'scan' } | { kind: 'working'; text: string } | { kind: 'error'; text: string }

export interface CheckinState {
  checkin: CheckinResult
  /** 這次打卡拿到的光點（0 代表今天已經拿過） */
  glow?: number
  /** 這次打卡掉落的稀有配件與樹上住戶（模擬），樹的頁面顯示一次 */
  drops?: CheckinDrops
}

export default function ScanPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'scan' })
  // 從地圖上樹旁的「掃樹牌」圈過來：提示要掃哪一棵（只是提示，掃到別棵照常處理）
  const hintTreeId = (useLocation().state as { hintTreeId?: string } | null)?.hintTreeId
  const [hint, setHint] = useState<Tree | null>(null)
  useEffect(() => {
    let alive = true
    if (hintTreeId) findTree(hintTreeId).then((t) => alive && setHint(t))
    return () => {
      alive = false
    }
  }, [hintTreeId])

  const handle = async (raw: string) => {
    const id = parseTreeId(raw)
    if (!id) return setStep({ kind: 'error', text: '這好像不是樹牌，再試一次。' })
    setStep({ kind: 'working', text: '找到樹牌了，正在確認你的位置…' })
    const [tree, position] = await Promise.all([
      findTree(id),
      isDemoMode() ? currentDemoPosition() : locate(),
    ])
    if (!tree) {
      return setStep({
        kind: 'error',
        text: `資料裡還沒有這棵樹（${id}）。資料是 ${DATA_VERSION} 的版本，新種的樹可能還沒有。`,
      })
    }
    // Demo：用模擬位置判斷（可以在地圖上拖曳人物移動），離太遠就是「太遠」，和真實使用一樣
    const checkin = judgeCheckin(tree.lngLat, tree.remark, position)
    let glow: number | undefined
    let drops: CheckinDrops | undefined
    if (checkin.kind === 'success' || checkin.kind === 'farView') {
      // 使用者文件還沒載入就寫，會拿空的 inventory 蓋掉雲端的造型；等不到就這次不掉落
      const ready = await whenUserReady()
      const today = dayKey()
      const firstToday = !getState().checkins.some((c) => c.treeId === id && c.result === 'success' && dayKey(new Date(c.at)) === today)
      recordCheckin(id, checkin.kind, { species: tree.species, night: !isDaytime() })
      await loadProtectedTrees() // 名冊還沒讀完就掃的話，等它，受保護的樹才會拿到 20
      glow = awardCheckin(id, checkin.kind)
      if (ready) drops = checkinDrops(id, checkin.kind, firstToday)
    }
    navigate(`/tree/${id}`, { replace: true, state: { checkin, glow, drops } satisfies CheckinState })
  }

  if (step.kind === 'scan') return <Scanner onResult={handle} onClose={() => navigate(SCAN_CLOSE_TO, { replace: true })} hint={hint} hintId={hintTreeId} />

  return (
    <div className="scan-status">
      <p>{step.text}</p>
      {step.kind === 'error' && (
        <div className="row gap">
          <button className="btn primary" onClick={() => setStep({ kind: 'scan' })}>
            再掃一次
          </button>
          <button className="btn" onClick={() => navigate(SCAN_CLOSE_TO, { replace: true })}>
            回地圖
          </button>
        </div>
      )}
    </div>
  )
}
