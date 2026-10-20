import { useId, useState } from 'react'
import { IconCheck } from '../../components/icons'
import { answerMood, clearMood, MOODS, moodById, type MoodId } from './mood'

/**
 * 打卡後，樹洞卡上方那一列「現在的心情？（可以不選）」（2026-10-21 第五輪，使用者決定：心情併進樹洞卡，
 * 不再是獨立的詢問卡）。七個小按鈕（`aria-pressed`，不是原生 radio：用方向鍵或 Tab 移動不會一路存下去），
 * 點了就存，再點別的就換，再點同一個就取消；選好後只留一句森林此刻的回應。沒有「就這個／略過」、沒有光點、不評價。
 * 選的人看得到的只有這一句；玩家的光與姿態（`light`）只是資料，不顯示。
 */
export function MoodAsk({
  selected,
  onPick = (id) => void answerMood(id),
  onClear = () => void clearMood(),
}: {
  selected: MoodId | null
  onPick?: (id: MoodId) => void
  onClear?: () => void
}) {
  const titleId = useId()
  const mood = moodById(selected)
  return (
    <div className="mood-ask" role="group" aria-labelledby={titleId} data-testid="mood-ask" data-value={mood?.id ?? ''}>
      <p id={titleId} className="mood-ask-title">
        現在的心情？<span className="muted">（可以不選）</span>
      </p>
      <div className="mood-chips">
        {MOODS.map((m) => {
          const on = m.id === mood?.id
          return (
            <button
              key={m.id}
              type="button"
              className={`mood-chip ${on ? 'on' : ''}`}
              aria-pressed={on}
              data-testid={`mood-chip-${m.id}`}
              onClick={() => (on ? onClear() : onPick(m.id))}
            >
              <span className="mood-chip-emoji" aria-hidden="true">
                {m.emoji}
              </span>
              <span>{m.name}</span>
              {on && (
                <span className="mood-chip-check" aria-hidden="true">
                  <IconCheck />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">{mood && <MoodLine id={mood.id} />}</div>
    </div>
  )
}

/** 森林此刻的回應：一句，手寫字。焦慮那句是邀請一次呼吸，旁邊多一個慢慢脹縮的小圓點 */
export function MoodLine({ id }: { id: MoodId }) {
  const mood = moodById(id)
  if (!mood) return null
  return (
    <p className="mood-forest" data-testid="mood-response" data-mood={mood.id}>
      {mood.breath && <span className="breath-dot" aria-hidden="true" />}
      {mood.response}
    </p>
  )
}

/**
 * 留完樹洞之後，心情那一列縮成一行「心情：疲憊・改」（沒選過就是「心情：沒選・選一個」）。
 * 點「改」再展開七個按鈕；選了（或取消）就縮回一行。第六輪（2026-10-20，設計批評）。
 */
export function MoodCollapsed({ selected }: { selected: MoodId | null }) {
  const [open, setOpen] = useState(false)
  const mood = moodById(selected)
  if (open)
    return (
      <MoodAsk
        selected={selected}
        onPick={(id) => {
          void answerMood(id)
          setOpen(false)
        }}
        onClear={() => {
          void clearMood()
          setOpen(false)
        }}
      />
    )
  return (
    <p className="mood-collapsed" data-testid="mood-collapsed" data-value={mood?.id ?? ''}>
      <span>
        心情：<strong>{mood ? mood.name : '沒選'}</strong>
      </span>
      <button type="button" className="mood-edit" onClick={() => setOpen(true)} data-testid="mood-edit" aria-label={mood ? `心情：${mood.name}，改` : '心情：沒選，選一個'}>
        {mood ? '改' : '選一個'}
      </button>
    </p>
  )
}
