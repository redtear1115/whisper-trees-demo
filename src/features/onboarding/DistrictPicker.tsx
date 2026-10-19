import { useRef, useState } from 'react'
import { homeDistrictOf, useOnboarding } from '../game/onboarding'
import {
  chooseHereDistrict,
  chooseOtherDistrict,
  DISTRICTS_NORTH_TO_SOUTH,
  hereNote,
  otherNote,
  setHomeDistrict,
} from './homeDistrict'

/**
 * 選「我的區」：全寬的「用目前位置」，12 區 3 欄單選（由北往南，原生 radio，方向鍵可換），全寬的「其他（不在台北市）」。
 * 點了立刻存。用目前位置：找得到在哪一區就選那一區，找不到就說原因、選項都還在。
 * 其他：有位置而且在台北市就用那一區，否則亂數挑一區並說出來（見 homeDistrict.ts）。
 * 新手引導的「你在哪一區？」與「我的」共用；where 決定提示文字裡要不要說「之後可以在『我的』換」。
 */
export function DistrictPicker({ name = 'home-district', where = 'tour' }: { name?: string; where?: 'tour' | 'me' }) {
  const ob = useOnboarding()
  const current = homeDistrictOf(ob)
  const [busy, setBusy] = useState<'here' | 'other' | null>(null)
  const [note, setNote] = useState('')
  const seq = useRef(0)

  const pick = (d: (typeof DISTRICTS_NORTH_TO_SOUTH)[number]) => {
    seq.current++ // 還在找位置時改點了某一區：以這次為準
    setBusy(null)
    setNote('')
    setHomeDistrict(d)
  }

  const here = async () => {
    const mine = ++seq.current
    setBusy('here')
    setNote('')
    const r = await chooseHereDistrict()
    if (mine !== seq.current) return
    setBusy(null)
    setNote(hereNote(r))
  }

  const other = async () => {
    const mine = ++seq.current
    setBusy('other')
    setNote('')
    const r = await chooseOtherDistrict()
    if (mine !== seq.current) return
    setBusy(null)
    setNote(otherNote(r, where))
  }

  const fromOther = ob.homeDistrictChoice === 'other' && current
  return (
    <div className="district-picker-wrap" data-testid="district-picker-wrap">
      <fieldset className="district-picker" data-testid="district-picker" data-value={current ?? ''}>
        <legend className="sr-only">你在哪一區</legend>
        <button type="button" className="district-here" onClick={here} disabled={busy !== null} data-testid="district-here">
          {busy === 'here' ? '正在找你在哪一區…' : '用目前位置'}
        </button>
        {DISTRICTS_NORTH_TO_SOUTH.map((d) => (
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
        <button type="button" className="district-other" onClick={other} disabled={busy !== null} data-testid="district-other">
          {busy === 'other' ? '正在找你在哪一區…' : '其他（不在台北市）'}
        </button>
      </fieldset>
      <p className="small muted district-note" role="status" data-testid="district-note">
        {note || (fromOther ? `你選了「其他」，先從${current}開始集章。` : '')}
      </p>
    </div>
  )
}
