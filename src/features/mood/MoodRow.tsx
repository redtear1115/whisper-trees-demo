import { useId, useState } from 'react'
import { MoodPicker } from './MoodPicker'
import { changeMood, clearMood, currentMoodOf, moodAge, useMood, type MoodId, type MoodState } from './mood'

/**
 * 「我的」頂部的心情列：目前的心情（名稱、多久以前；emoji 只在選擇器裡，第五輪統一）與「換心情」。
 * 這裡是換心情的唯一地方（樹的頁面不換）。沒選過就一行安靜的邀請。
 */
export function MoodRow() {
  return <MoodRowView state={useMood()} />
}

/** 畫面本身（狀態從外面傳進來，方便測試） */
export function MoodRowView({ state }: { state: MoodState }) {
  const cur = currentMoodOf(state)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MoodId | null>(null)
  const boxId = useId()

  const toggle = () => {
    if (!open) setDraft(cur?.mood.id ?? null)
    setOpen(!open)
  }

  return (
    <>
      <div className="me-swap me-mood" data-testid="me-mood" data-value={cur?.mood.id ?? ''}>
        <span className="me-mood-text">
          {cur ? (
            <>
              現在的心情：
              <strong>{cur.mood.name}</strong>
              <span className="muted small me-mood-age"> ・{moodAge(cur.at)}</span>
            </>
          ) : (
            <span className="muted small">還沒選心情。想的時候再選，沒有也沒關係。</span>
          )}
        </span>
        <button type="button" className="btn me-swap-btn" aria-expanded={open} aria-controls={boxId} onClick={toggle} data-testid="swap-mood">
          {open ? '收起' : cur ? '換心情' : '選心情'}
        </button>
      </div>
      <div id={boxId} className="me-mood-box" hidden={!open}>
        {open && (
          <>
            <MoodPicker name="me-mood" value={draft} onChange={setDraft} />
            <div className="mood-actions">
              <button
                type="button"
                className="btn primary"
                disabled={!draft || draft === cur?.mood.id}
                data-testid="mood-save"
                onClick={() => {
                  if (!draft) return
                  void changeMood(draft)
                  setOpen(false)
                }}
              >
                {!draft ? '先選一個' : draft === cur?.mood.id ? '就是現在這個' : '就這個'}
              </button>
              {cur && (
                <button
                  type="button"
                  className="btn ghost"
                  data-testid="mood-clear"
                  onClick={() => {
                    void clearMood()
                    setDraft(null)
                    setOpen(false)
                  }}
                >
                  清除心情
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
