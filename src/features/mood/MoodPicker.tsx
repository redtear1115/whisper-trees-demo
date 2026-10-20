import { useId } from 'react'
import { MOODS, type MoodId } from './mood'

/**
 * 7 個心情的單選（radiogroup，原生 radio，方向鍵可以移動）。只有這裡出現 emoji（簡報：臉部留白）。
 * 選了先不存，按外面的「就這個」才存；這樣用方向鍵移動、或點錯，都不會一下子就決定。
 */
export function MoodPicker({ value, onChange, name }: { value: MoodId | null; onChange: (id: MoodId) => void; name: string }) {
  const labelId = useId()
  return (
    <div className="mood-picker" role="radiogroup" aria-labelledby={labelId} data-testid="mood-picker" data-value={value ?? ''}>
      <span id={labelId} className="sr-only">
        現在的心情
      </span>
      {MOODS.map((m) => (
        <label key={m.id} className={`mood-option ${m.id === value ? 'on' : ''}`} data-testid={`mood-option-${m.id}`}>
          <input type="radio" name={name} value={m.id} checked={m.id === value} onChange={() => onChange(m.id)} className="visually-hidden" />
          <span className="mood-emoji" aria-hidden="true">
            {m.emoji}
          </span>
          <span className="mood-name">{m.name}</span>
        </label>
      ))}
    </div>
  )
}
