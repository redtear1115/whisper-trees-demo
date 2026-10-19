import { useRef, useState } from 'react'
import { TAIPEI_DISTRICTS } from '../../store/types'
import { homeDistrictOf, useOnboarding } from '../game/onboarding'
import { chooseOtherDistrict, otherNote, setHomeDistrict } from './homeDistrict'

/**
 * 選「我的區」：12 區 3 欄的單選（原生 radio，方向鍵可換）＋全寬的「其他（不在台北市）」。
 * 點了立刻存。其他：有位置而且在台北市就用那一區，否則亂數挑一區並說出來（見 homeDistrict.ts）。
 * 新手引導第 0 步與「我的」共用。
 */
export function DistrictPicker({ name = 'home-district' }: { name?: string }) {
  const ob = useOnboarding()
  const current = homeDistrictOf(ob)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const seq = useRef(0)

  const pick = (d: (typeof TAIPEI_DISTRICTS)[number]) => {
    seq.current++ // 還在找位置時改點了某一區：以這次為準
    setBusy(false)
    setNote('')
    setHomeDistrict(d)
  }

  const other = async () => {
    const mine = ++seq.current
    setBusy(true)
    setNote('')
    const r = await chooseOtherDistrict()
    if (mine !== seq.current) return
    setBusy(false)
    setNote(otherNote(r))
  }

  const fromOther = ob.homeDistrictChoice === 'other' && current
  return (
    <div className="district-picker-wrap" data-testid="district-picker-wrap">
      <fieldset className="district-picker" data-testid="district-picker" data-value={current ?? ''}>
        <legend className="sr-only">你在哪一區</legend>
        {TAIPEI_DISTRICTS.map((d) => (
          <label key={d} className={`district-chip ${d === current ? 'on' : ''}`} data-testid={`district-option-${d}`}>
            <input
              type="radio"
              name={name}
              value={d}
              checked={d === current}
              onChange={() => pick(d)}
              className="visually-hidden"
            />
            {d}
          </label>
        ))}
        <button type="button" className="district-other" onClick={other} disabled={busy} data-testid="district-other">
          {busy ? '正在找你在哪一區…' : '其他（不在台北市）'}
        </button>
      </fieldset>
      <p className="small muted district-note" role="status" data-testid="district-note">
        {note || (fromOther ? `你選了「其他」，先從${current}開始。` : '')}
      </p>
    </div>
  )
}
