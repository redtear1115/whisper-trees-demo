import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '../features/checkin/Scanner'
import { parseTreeId } from '../lib/treeId'
import { findTree } from '../lib/trees'
import { judgeCheckin, offsetNorth, type CheckinResult } from '../lib/geo'
import { locate } from '../lib/locate'
import { CHECKIN, DATA_VERSION } from '../config'
import { isDemoMode, recordCheckin } from '../store'
import { awardCheckin, isDaytime } from '../features/game/ledger'

type Step = { kind: 'scan' } | { kind: 'working'; text: string } | { kind: 'error'; text: string }

export interface CheckinState {
  checkin: CheckinResult
  /** 這次打卡拿到的光點（0 代表今天已經拿過） */
  glow?: number
}

export default function ScanPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'scan' })

  const handle = async (raw: string) => {
    const id = parseTreeId(raw)
    if (!id) return setStep({ kind: 'error', text: '這好像不是樹牌，再試一次。' })
    setStep({ kind: 'working', text: '找到樹牌了，正在確認你的位置…' })
    const [tree, position] = await Promise.all([
      findTree(id),
      isDemoMode() ? Promise.resolve(null) : locate(),
    ])
    if (!tree) {
      return setStep({
        kind: 'error',
        text: `資料裡還沒有這棵樹（${id}）。資料是 ${DATA_VERSION} 的版本，新種的樹可能還沒有。`,
      })
    }
    const pos = isDemoMode() ? { lngLat: offsetNorth(tree.lngLat, CHECKIN.demoOffsetMeters), accuracy: CHECKIN.demoAccuracy } : position
    const checkin = judgeCheckin(tree.lngLat, tree.remark, pos)
    let glow: number | undefined
    if (checkin.kind === 'success' || checkin.kind === 'farView') {
      recordCheckin(id, checkin.kind, { species: tree.species, night: !isDaytime() })
      glow = awardCheckin(id, checkin.kind)
    }
    navigate(`/tree/${id}`, { replace: true, state: { checkin, glow } satisfies CheckinState })
  }

  if (step.kind === 'scan') return <Scanner onResult={handle} onClose={() => navigate(-1)} />

  return (
    <div className="scan-status">
      <p>{step.text}</p>
      {step.kind === 'error' && (
        <div className="row gap">
          <button className="btn primary" onClick={() => setStep({ kind: 'scan' })}>
            再掃一次
          </button>
          <button className="btn" onClick={() => navigate('/')}>
            回地圖
          </button>
        </div>
      )}
    </div>
  )
}
