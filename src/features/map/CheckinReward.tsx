import { useEffect } from 'react'
import { checkinPointsLine } from '../game/checkinLine'
import { DropCards } from '../game/DropCards'
import { useIsProtectedTree } from '../game/protectedTrees'
import { useCelebrationBlocking } from '../onboarding/celebrationGate'
import type { FocusAfterScan } from '../../pages/ScanPage'

/** 沒有掉落時，獎勵卡停多久自己收起（毫秒）；有掉落（有連結）就等使用者按 */
export const REWARD_AUTO_MS = 2600

/**
 * 掃樹牌打卡成功、回到拉近畫面時，樹上跳一下的獎勵卡（掃完不另開樹的頁面）：
 * 「打卡成功」「收進 N 道光點」，有掉落（稀有配件、樹上住戶）一起亮出來。點一下或幾秒後收起，接著打開剛剛點的互動。
 * 慶祝視窗（第一道光、徽章）開著時不倒數，等它關掉。
 */
export function CheckinReward({ treeId, reward, onDone }: { treeId: string; reward: FocusAfterScan['reward']; onDone: () => void }) {
  const isProtected = useIsProtectedTree(treeId)
  const celebrating = useCelebrationBlocking()
  const hasDrops = !!(reward.drops?.hat || reward.drops?.insect)
  const line = checkinPointsLine({ glow: reward.glow, kind: reward.kind, protectedTree: isProtected })

  useEffect(() => {
    if (hasDrops || celebrating) return
    const t = window.setTimeout(onDone, REWARD_AUTO_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrops, celebrating])

  return (
    <section className="checkin-reward" role="status" data-testid="checkin-reward" aria-label="打卡結果">
      <p className="checkin-reward-title">{reward.kind === 'farView' ? '遠遠陪著它' : '打卡成功'}</p>
      {line && (
        <p className="checkin-reward-points" data-testid="checkin-points">
          {line}
        </p>
      )}
      {reward.kind === 'farView' && <p className="muted small">這棵樹在安全島上，在人行道看著它就好。</p>}
      <DropCards drops={reward.drops} />
      <button type="button" className="btn primary" data-testid="checkin-reward-ok" onClick={onDone}>
        好
      </button>
    </section>
  )
}
