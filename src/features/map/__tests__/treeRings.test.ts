import { describe, expect, it } from 'vitest'
import { CHECKIN } from '../../../config'
import { checkinRadius, offsetNorth, type LngLat } from '../../../lib/geo'
import { ADOPT_NOTE, farNote, focusActions, focusButtons, rangeInfo } from '../treeRings'

const tree: LngLat = [121.5287, 25.0335]
const demoAnchor = (lngLat: LngLat) => ({ lngLat, source: 'demo' as const })
const gpsAnchor = (lngLat: LngLat, accuracy: number) => ({ lngLat, source: 'gps' as const, accuracy })

describe('rangeInfo', () => {
  it('uses checkinRadius (Demo accuracy 5 m → 35 m): inside 0.5 m is in range, outside 0.5 m is not', () => {
    const r = checkinRadius(CHECKIN.demoAccuracy)
    expect(r).toBe(35)
    expect(rangeInfo(demoAnchor(offsetNorth(tree, r - 0.5)), tree).inRange).toBe(true)
    const out = rangeInfo(demoAnchor(offsetNorth(tree, r + 0.5)), tree)
    expect(out.inRange).toBe(false)
    expect(out.remaining).toBe(1)
  })
  it('follows the GPS accuracy like check-in does', () => {
    const at = offsetNorth(tree, 50)
    expect(rangeInfo(gpsAnchor(at, 0), tree).inRange).toBe(false) // 30 m
    expect(rangeInfo(gpsAnchor(at, 30), tree).inRange).toBe(true) // 60 m
  })
  it('counts the metres still to walk, rounded up', () => {
    const info = rangeInfo(demoAnchor(offsetNorth(tree, 60)), tree)
    expect(info.remaining).toBe(25)
  })
  it('treats no location (fallback) as far, with no number', () => {
    const info = rangeInfo({ lngLat: tree, source: 'fallback' }, tree)
    expect(info).toEqual({ distance: null, inRange: false, remaining: null })
  })
})

describe('farNote', () => {
  it('says how far to go, calmly', () => {
    expect(farNote({ distance: 60, inRange: false, remaining: 25 })).toBe('走近一點，還有約 25 公尺')
  })
  it('has a different line when there is no position', () => {
    expect(farNote({ distance: null, inRange: false, remaining: null })).toContain('位置')
  })
  it('is empty in range', () => {
    expect(farNote({ distance: 3, inRange: true, remaining: null })).toBe('')
  })
})

describe('focusActions（拉近畫面的圈）', () => {
  const near = { distance: 10, inRange: true, remaining: null }
  const far = { distance: 60, inRange: false, remaining: 25 }
  const none = { distance: null, inRange: false, remaining: null }
  const ids = (list: ReturnType<typeof focusActions>) => list.map((a) => a.id)
  const on = (list: ReturnType<typeof focusActions>) => list.filter((a) => a.enabled).map((a) => a.id)

  it('three main rings (摸摸樹, 回報, 留言在樹洞) and 認養, in a fixed order; 樹的資料 is not a ring', () => {
    const list = focusActions(near, true)
    expect(ids(list)).toEqual(['touch', 'report', 'whisper', 'adopt'])
    expect(list.map((a) => a.label)).toEqual(['摸摸樹', '回報', '留言在樹洞', '認養'])
    expect(list.map((a) => a.size)).toEqual(['main', 'main', 'main', 'small'])
  })
  it('after check-in the three interactions open their cards (no scan); 認養 never opens', () => {
    for (const r of [near, far]) {
      const list = focusActions(r, true)
      expect(on(list)).toEqual(['touch', 'report', 'whisper'])
      expect(list.some((a) => a.first)).toBe(false)
    }
    const adopt = focusActions(near, true).find((a) => a.id === 'adopt')!
    expect(adopt.why).toBe(ADOPT_NOTE)
    expect(adopt.aria).toContain('即將開放')
  })
  it('in range but not checked in: rings stay lit and go to scanning first', () => {
    const list = focusActions(near, false)
    expect(on(list)).toEqual(['touch', 'report', 'whisper'])
    expect(list.filter((a) => a.first === 'scan').map((a) => a.id)).toEqual(['touch', 'report', 'whisper'])
    expect(list[0].aria).toContain('先掃樹牌')
  })
  it('out of range: rings stay lit and walk there first', () => {
    const list = focusActions(far, false)
    expect(on(list)).toEqual(['touch', 'report', 'whisper'])
    expect(list.filter((a) => a.first === 'walk').map((a) => a.id)).toEqual(['touch', 'report', 'whisper'])
    expect(list[0].aria).toContain('先走到樹旁')
  })
  it('no position: grey and say so (nowhere to walk from)', () => {
    const list = focusActions(none, false)
    expect(on(list)).toEqual([])
    expect(list[2].why).toContain('位置')
    expect(list[2].first).toBeNull()
  })
})

describe('focusButtons（返回右邊的按鈕）', () => {
  it('in range or checked in: nothing extra (樹的資料 is always there)', () => {
    expect(focusButtons({ distance: 10, inRange: true, remaining: null }, false, true)).toEqual({ route: false, walk: false })
    expect(focusButtons({ distance: 60, inRange: false, remaining: 25 }, true, true)).toEqual({ route: false, walk: false })
  })
  it('out of range: 怎麼走, plus 走過去 in Demo', () => {
    const far = { distance: 60, inRange: false, remaining: 25 }
    expect(focusButtons(far, false, false)).toEqual({ route: true, walk: false })
    expect(focusButtons(far, false, true)).toEqual({ route: true, walk: true })
  })
  it('no position: no route (no starting point)', () => {
    expect(focusButtons({ distance: null, inRange: false, remaining: null }, false, false).route).toBe(false)
  })
})
