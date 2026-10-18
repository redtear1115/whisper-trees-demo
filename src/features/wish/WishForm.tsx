import { useState } from 'react'
import { WISH_REASONS, type Wish } from '../../store/types'
import { createWish } from '../../store'
import type { LngLat } from '../../lib/geo'
import { FEASIBILITY_TEXT } from './feasibility'
import { award } from '../game/ledger'

export interface PitInfo {
  pitId: string
  lngLat: LngLat
  road: string
  district: string
}

/** 在空樹穴許願；送出當下給可行性初審 */
export function WishForm({ pit, onDone }: { pit: PitInfo; onDone: (w: Wish) => void }) {
  const [reasons, setReasons] = useState<string[]>([])
  const toggle = (r: string) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  return (
    <form
      className="wish-form"
      onSubmit={(e) => {
        e.preventDefault()
        const wish = createWish({ ...pit, reasons, feasibility: 'emptyPit' })
        award('wish', wish.id)
        onDone(wish)
      }}
    >
      <p>為什麼這裡需要一棵樹？（可複選）</p>
      <div className="chips">
        {WISH_REASONS.map((r) => (
          <button
            type="button"
            key={r}
            className={`chip ${reasons.includes(r) ? 'on' : ''}`}
            aria-pressed={reasons.includes(r)}
            onClick={() => toggle(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <button className="btn primary block" disabled={reasons.length === 0}>
        許願種樹
      </button>
    </form>
  )
}

export function FeasibilityResult() {
  return (
    <div className="feasibility">
      <p className="banner ok">初審：{FEASIBILITY_TEXT.emptyPit}</p>
      <p className="muted small">資料顯示這裡沒有登錄的樹，市府會先到現場確認。</p>
    </div>
  )
}
