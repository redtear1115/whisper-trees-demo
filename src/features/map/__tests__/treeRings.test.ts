import { describe, expect, it } from 'vitest'
import { CHECKIN } from '../../../config'
import { checkinRadius, offsetNorth, type LngLat } from '../../../lib/geo'
import { ADOPT_NOTE, farNote, focusActions, focusButtons, rangeInfo, SCAN_FIRST_NOTE } from '../treeRings'

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

  it('three main rings (摸摸樹, 回報, 留言在樹洞) and two small ones, in a fixed order', () => {
    const list = focusActions('T1', near, true)
    expect(ids(list)).toEqual(['touch', 'report', 'whisper', 'info', 'adopt'])
    expect(list.map((a) => a.label)).toEqual(['摸摸樹', '回報', '留言在樹洞', '樹的資料', '認養'])
    expect(list.map((a) => a.size)).toEqual(['main', 'main', 'main', 'small', 'small'])
  })
  it('after check-in the three interactions open; 認養 never does', () => {
    expect(on(focusActions('T1', near, true))).toEqual(['touch', 'report', 'whisper', 'info'])
    expect(on(focusActions('T1', far, true))).toEqual(['touch', 'report', 'whisper', 'info'])
    const adopt = focusActions('T1', near, true).find((a) => a.id === 'adopt')!
    expect(adopt.why).toBe(ADOPT_NOTE)
    expect(adopt.aria).toContain('即將開放')
  })
  it('in range but not checked in: say scan first', () => {
    const list = focusActions('T1', near, false)
    expect(on(list)).toEqual(['info'])
    expect(list[0].why).toBe(SCAN_FIRST_NOTE)
    expect(list[0].aria).toContain('暫時不能用')
  })
  it('out of range: say how far; no position: say so', () => {
    expect(focusActions('T1', far, false)[1].why).toBe('走近一點，還有約 25 公尺')
    expect(focusActions('T1', none, false)[2].why).toContain('位置')
  })
  it('report and whisper land on page anchors; touch and adopt do not change page', () => {
    const list = focusActions('T1', near, true)
    expect(list.find((a) => a.id === 'report')).toMatchObject({ to: '/tree/T1', hash: 'report' })
    expect(list.find((a) => a.id === 'whisper')).toMatchObject({ to: '/tree/T1', hash: 'whisper' })
    expect(list.find((a) => a.id === 'info')).toMatchObject({ to: '/tree/T1' })
    expect(list.find((a) => a.id === 'touch')?.to).toBe('')
  })
})

describe('focusButtons（返回旁邊的按鈕）', () => {
  it('in range, not checked in: 掃樹牌 only', () => {
    expect(focusButtons({ distance: 10, inRange: true, remaining: null }, false, true)).toEqual({ scan: true, route: false, walk: false })
  })
  it('out of range: 怎麼走, plus 走過去 in Demo', () => {
    const far = { distance: 60, inRange: false, remaining: 25 }
    expect(focusButtons(far, false, false)).toEqual({ scan: false, route: true, walk: false })
    expect(focusButtons(far, false, true)).toEqual({ scan: false, route: true, walk: true })
  })
  it('no position: no route (no starting point)', () => {
    expect(focusButtons({ distance: null, inRange: false, remaining: null }, false, false).route).toBe(false)
  })
  it('checked in: only 返回', () => {
    expect(focusButtons({ distance: 10, inRange: true, remaining: null }, true, true)).toEqual({ scan: false, route: false, walk: false })
  })
})
