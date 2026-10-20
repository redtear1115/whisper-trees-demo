import { useState, type ReactNode } from 'react'
import { addWhisper, useSession } from '../../store'
import { award } from '../game/ledger'

/** mood：留完話之後那一句的心情（剛說完展開，之後縮成一行） */
export function WhisperBox({ treeId, said, mood }: { treeId: string; said: string[]; mood: (open: boolean) => ReactNode }) {
  const cloud = useSession().backend === 'cloud'
  const [text, setText] = useState('')
  const [writing, setWriting] = useState(said.length === 0)
  const [justSaid, setJustSaid] = useState<string | null>(null)
  const last = justSaid ?? said[said.length - 1]

  if (!writing && last)
    return (
      <section className="whisper received" aria-live="polite">
        <p className={`whisper-sent ${justSaid ? 'drift' : ''}`}>「{last}」</p>
        <p className="whisper-ack">樹收到了。</p>
        <p className="muted small">
          {cloud ? '其他人看不到。存在曦語的雲端，不公開。下次回來，它會記得。' : '只有你看得到，不會上傳。下次回來，它會記得。'}
        </p>
        <button
          className="btn ghost again"
          onClick={() => {
            setJustSaid(null)
            setWriting(true)
          }}
        >
          再說一句
        </button>
        <div className="whisper-mood">{mood(!!justSaid)}</div>
      </section>
    )

  return (
    <section className="whisper" aria-labelledby="whisper-title">
      <h2 id="whisper-title">樹洞</h2>
      <p className="muted small">{cloud ? '其他人看不到。存在曦語的雲端，不公開。' : '只有你看得到。不會上傳，也不公開。'}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          addWhisper(treeId, text)
          award('whisper', treeId)
          setJustSaid(text.trim().slice(0, 140))
          setText('')
          setWriting(false)
        }}
      >
        <textarea
          className="input"
          value={text}
          maxLength={140}
          rows={3}
          placeholder="對這棵樹說一句話"
          onChange={(e) => setText(e.target.value)}
          aria-label="對這棵樹說一句話"
        />
        <div className="row between center-v">
          <span className="muted small">{text.length} / 140</span>
          <button className="btn primary" disabled={!text.trim()}>
            留在樹洞
          </button>
        </div>
      </form>
    </section>
  )
}
