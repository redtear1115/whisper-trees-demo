import { useState } from 'react'
import { WISH_REASONS, type Wish } from '../../store/types'
import { createWish } from '../../store'
import type { LngLat } from '../../lib/geo'
import { FEASIBILITY_TEXT } from './feasibility'
import { award } from '../game/ledger'
import { Art } from '../../components/ui'

export interface PitInfo {
  /** null：不是樹穴，在地圖任意位置長按許願 */
  pitId: string | null
  lngLat: LngLat
  road: string
  district: string
}

/** 在空樹穴許願；送出當下給可行性的初步判斷 */
export function WishForm({ pit, onDone }: { pit: PitInfo; onDone: (w: Wish) => void }) {
  const [reasons, setReasons] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const toggle = (r: string) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  return (
    <form
      className="wish-form"
      onSubmit={(e) => {
        e.preventDefault()
        let wish: Wish
        try {
          wish = createWish({ ...pit, reasons, feasibility: pit.pitId ? 'emptyPit' : 'needsSurvey' })
        } catch (err) {
          const why = (err as Error).message
          return setError(
            why === 'district'
              ? '這個位置找不到所在的行政區，請在樹穴或街道旁邊再許一次。'
              : '還沒連上雲端，請稍等一下再許願。',
          )
        }
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
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary block" disabled={reasons.length === 0} aria-describedby="wish-hint">
        許願種樹
      </button>
      <p id="wish-hint" className="muted small hint">
        {reasons.length === 0 ? '先選一個原因，再許願。' : '送出後，市府會看到這個願望。'}
      </p>
    </form>
  )
}

/** 許願送出後的那一刻：願望種下了、初步判斷（光點只記在「小芽」，不在這裡打斷） */
export function FeasibilityResult({ wish }: { wish: Wish }) {
  const easy = wish.feasibility === 'emptyPit'
  return (
    <div className="wish-planted" role="status">
      <Art id="sapling" alt="" className="icon" />
      <div>
        <p className="wish-planted-title">願望種下了。</p>
        <p className="small">路過的人都可以幫它澆水，市府會在這裡看到你的聲音。</p>
        <p className={`small feas ${easy ? 'ok' : 'warn'}`}>
          初步判斷：{FEASIBILITY_TEXT[wish.feasibility]}・
          {easy ? '資料顯示這裡沒有登錄的樹，市府會先到現場確認。' : '這裡不是既有樹穴，要先確認人行道寬度與地下管線。'}
        </p>
      </div>
    </div>
  )
}
