import { useState } from 'react'
import { STATUS_FLOW, STATUS_LABEL, type Wish } from '../../store/types'
import { hasWateredToday, totalWater, useStore, waterWish, wishStatus } from '../../store'
import { Art, MockTag, formatDate } from '../../components/ui'
import { FEASIBILITY_TEXT } from './feasibility'
import { award } from '../game/ledger'
import { IconCheck } from '../../components/icons'

/** 許願的進度時間軸與澆水 */
export function WishCard({ wish, compact }: { wish: Wish; compact?: boolean }) {
  const watered = useStore((s) => hasWateredToday(wish.id, s))
  const [msg, setMsg] = useState<string | null>(null)
  const status = wishStatus(wish)

  return (
    <div className="wish-card">
      <div className="row between center-v">
        <div>
          <strong>
            {wish.district} {wish.road || '（路名待確認）'}
          </strong>
          <p className="muted small">
            {wish.reasons.join('・')} ・ {FEASIBILITY_TEXT[wish.feasibility]}
            {wish.mock && <MockTag title="Demo 預先放的示範許願" />}
          </p>
        </div>
        {compact && <span className={`status-pill s-${status}`}>{STATUS_LABEL[status]}</span>}
      </div>

      {!compact && <Timeline wish={wish} />}

      <div className="row between center-v water-row">
        <span>
          <Art id="watering" alt="" className="icon sm" /> 已澆水 <strong>{totalWater(wish)}</strong> 次
          {wish.seedWater > 0 && <MockTag title="含模擬的既有澆水數" />}
        </span>
        {status !== 'planted' &&
          status !== 'rejected' &&
          (watered ? (
            <span className="watered-done" role="status">
              <IconCheck /> 今天澆過了，明天再來
            </span>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                if (!waterWish(wish.id)) return setMsg('今天已經澆過了。')
                const glow = award('water', wish.id)
                setMsg(glow ? `謝謝你。光點 +${glow}` : '謝謝你。')
              }}
            >
              澆水 +1
            </button>
          ))}
      </div>
      {msg && (
        <p className="muted small" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}

function Timeline({ wish }: { wish: Wish }) {
  const status = wishStatus(wish)
  const at = (s: string) => wish.history.findLast((e) => e.status === s)
  const rejected = status === 'rejected' ? wish.history[wish.history.length - 1] : undefined
  // 跳過的步驟也算走過：已排程代表會勘已完成
  const furthest = Math.max(...wish.history.map((e) => STATUS_FLOW.indexOf(e.status)))
  return (
    <ol className="timeline">
      {STATUS_FLOW.map((s) => {
        const e = at(s)
        return (
          <li key={s} className={STATUS_FLOW.indexOf(s) <= furthest ? 'done' : ''}>
            <span className="dot" />
            <span>{STATUS_LABEL[s]}</span>
            {e && <span className="muted small">{formatDate(e.at)}</span>}
          </li>
        )
      })}
      {rejected && (
        <li className="done rejected">
          <span className="dot" />
          <span>不可種：{rejected.reason}</span>
          <span className="muted small">{formatDate(rejected.at)}</span>
        </li>
      )}
    </ol>
  )
}
