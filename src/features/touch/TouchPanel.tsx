import { useEffect, useState } from 'react'
import { award } from '../game/ledger'
import { reportPointsLine } from '../game/checkinLine'
import { recordTouch, type TouchId } from '../journal/diary'
import { InteractionMood } from '../journal/InteractionMood'
import { breathPhase, MEDITATE_MS, meditateLeft, TOUCHES } from './touch'

type Step = { kind: 'pick' } | { kind: 'doing'; id: TouchId; start: number } | { kind: 'done'; id: TouchId; at: number; glow: number }

/**
 * 摸摸樹：選呼吸、冥想或擁抱 → 跟著做 → 做完記一筆日記（recordTouch）、算一個互動（award('touch')），
 * 然後可以加一個心情。在感應圈內（或打過卡）才打得開，不用掃樹牌（拉近畫面擋著）。純 CSS 動畫，減少動態時不動，只有文字。
 */
export function TouchPanel({ treeId, onClose }: { treeId: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [now, setNow] = useState(() => Date.now())

  const doing = step.kind === 'doing' ? step : null
  useEffect(() => {
    if (!doing) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [doing])

  const finish = (id: TouchId) => {
    const at = Date.now()
    void recordTouch(treeId, id, at)
    setStep({ kind: 'done', id, at, glow: award('touch', treeId) })
  }

  const elapsed = doing ? now - doing.start : 0
  const breath = doing?.id === 'breathe' ? breathPhase(elapsed) : null
  const left = doing?.id === 'meditate' ? meditateLeft(elapsed) : null
  // 時間到了就算做完（呼吸三輪、冥想一分鐘）
  useEffect(() => {
    if (doing && ((breath && breath.done) || left === 0)) finish(doing.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breath?.done, left])

  return (
    <section className="touch-panel" data-testid="touch-panel" aria-labelledby="touch-title">
      <h2 id="touch-title" className="touch-title">
        摸摸樹
      </h2>

      {step.kind === 'pick' && (
        <>
          <p className="muted small">選一件小事，在樹旁做一下。</p>
          <div className="touch-picks">
            {TOUCHES.map((t) => (
              <button key={t.id} type="button" className="touch-pick" data-testid={`touch-${t.id}`} onClick={() => {
                  const start = Date.now()
                  setNow(start)
                  setStep({ kind: 'doing', id: t.id, start })
                }}>
                <strong>{t.name}</strong>
                <span className="muted small">{t.blurb}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost block" onClick={onClose}>
            先不用
          </button>
        </>
      )}

      {doing && doing.id === 'breathe' && breath && (
        <div className="touch-guide" data-testid="touch-guide-breathe">
          <span className={`touch-breath ${breath.phase}`} aria-hidden="true" />
          <p className="touch-say" aria-live="polite">
            {breath.phase === 'in' ? '吸氣……' : '吐氣……'}
          </p>
          <p className="muted small">第 {breath.round}／3 輪</p>
        </div>
      )}

      {doing && doing.id === 'meditate' && left !== null && (
        <div className="touch-guide" data-testid="touch-guide-meditate">
          <span className="touch-clock" aria-hidden="true" style={{ ['--p' as string]: `${(1 - (left * 1000) / MEDITATE_MS) * 360}deg` }} />
          <p className="touch-say">閉上眼睛，聽聽葉子的聲音。</p>
          <p className="muted small" role="timer" aria-live="off">
            還有 {left} 秒
          </p>
        </div>
      )}

      {doing && doing.id === 'hug' && (
        <div className="touch-guide" data-testid="touch-guide-hug">
          <p className="touch-say">張開手臂，輕輕抱一下樹幹，感覺它的溫度。</p>
          <button type="button" className="btn primary block" data-testid="touch-hug-done" onClick={() => finish('hug')}>
            抱好了
          </button>
        </div>
      )}

      {doing && (
        <button type="button" className="btn ghost block" onClick={() => setStep({ kind: 'pick' })}>
          先停在這裡
        </button>
      )}

      {step.kind === 'done' && (
        <div className="touch-done" data-testid="touch-done">
          <p className="touch-say">謝謝你陪它一下。</p>
          {step.glow > 0 && <p className="muted small">{reportPointsLine(step.glow)}</p>}
          <InteractionMood kind="touch" treeId={treeId} at={step.at} open />
          <button type="button" className="btn primary block" data-testid="touch-close" onClick={onClose}>
            好
          </button>
        </div>
      )}
    </section>
  )
}
