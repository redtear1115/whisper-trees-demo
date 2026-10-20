import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoodPicker } from './MoodPicker'
import { answerMood, INTERACTIONS, skipMood, type Mood, type MoodId } from './mood'

/** 打卡之後的「現在的心情？」：一張安靜的小卡，選一個（或略過），沒有光點、不評價 */
export function MoodPrompt() {
  const [draft, setDraft] = useState<MoodId | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <section className="card mood-card" aria-labelledby="mood-prompt-title" data-testid="mood-prompt">
      <h2 id="mood-prompt-title" className="mood-title">
        現在的心情？
      </h2>
      <p className="muted small mood-privacy">只有你自己看得到，不會給別人看。選哪個都可以，也可以略過。</p>
      <MoodPicker name="mood-prompt" value={draft} onChange={setDraft} />
      <div className="mood-actions">
        <button
          type="button"
          className="btn primary"
          disabled={!draft || busy}
          data-testid="mood-confirm"
          onClick={() => {
            if (!draft) return
            setBusy(true)
            void answerMood(draft)
          }}
        >
          就這個
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          data-testid="mood-skip"
          onClick={() => {
            setBusy(true)
            void skipMood()
          }}
        >
          略過
        </button>
      </div>
    </section>
  )
}

/**
 * 選好心情之後樹的頁面上的小卡：森林的回應是主角，玩家的光與姿態是安靜的小字。
 * 建議的互動：樹的頁面上沒有任何一個（澆水在地圖上、其餘還沒做），所以只用文字提到，不加新功能。
 */
export function MoodResponse({ mood }: { mood: Mood }) {
  const it = INTERACTIONS[mood.suggest]
  return (
    <section className="card mood-card mood-response" aria-label="森林的回應" data-testid="mood-response" data-mood={mood.id}>
      <p className="mood-forest">{mood.response}</p>
      <p className="muted small mood-light">你的光：{mood.light}</p>
      <p className="mood-suggest" data-testid="mood-suggest">
        <span className="mood-suggest-tag">建議</span>
        <strong>{it.label}</strong>
        <span className="muted small">{it.note}</span>
      </p>
      <Link className="mood-change" to="/me">
        想換心情，到「我的」
      </Link>
    </section>
  )
}
