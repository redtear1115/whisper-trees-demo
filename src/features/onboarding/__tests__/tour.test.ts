import { describe, expect, it } from 'vitest'
import { inAppBrowser } from '../../../lib/firebase'
import {
  firstLightCelebration,
  installPlatform,
  isStandalone,
  reopenPatch,
  shouldRecordHomeScreen,
  STEP_CELEBRATE,
  STEP_DONE,
  STEP_HOME,
  STEP_INTRO,
  STEP_SCAN,
  tourView,
} from '../tour'

describe('tourView', () => {
  it('shows step 1 for a new user once the user doc is ready, and asks to persist the step', () => {
    expect(tourView({ ob: {}, firstLight: false, ready: true })).toEqual({ open: true, step: STEP_INTRO, needsInit: true })
  })
  it('stays closed until the user doc is ready (avoid flashing for someone who already dismissed)', () => {
    expect(tourView({ ob: {}, firstLight: false, ready: false }).open).toBe(false)
  })
  it('resumes at the saved step', () => {
    expect(tourView({ ob: { tourStep: 2 }, firstLight: false, ready: true })).toEqual({ open: true, step: STEP_SCAN, needsInit: false })
  })
  it('is hidden after 之後再說', () => {
    expect(tourView({ ob: { tourStep: 1, tourDismissedAt: 123 }, firstLight: false, ready: true }).open).toBe(false)
  })
  it('first earn jumps to the celebration for someone who started the tour', () => {
    expect(tourView({ ob: { tourStep: 2 }, firstLight: true, ready: true }).step).toBe(STEP_CELEBRATE)
    expect(tourView({ ob: { tourStep: 1 }, firstLight: true, ready: true }).step).toBe(STEP_CELEBRATE)
  })
  it('stays on the home-screen step until finished', () => {
    expect(tourView({ ob: { tourStep: 4 }, firstLight: true, ready: true }).step).toBe(STEP_HOME)
    expect(tourView({ ob: { tourStep: STEP_DONE }, firstLight: true, ready: true }).open).toBe(false)
  })
  it('is hidden for a user who already had first light and never started the tour', () => {
    expect(tourView({ ob: {}, firstLight: true, ready: true }).open).toBe(false)
    expect(tourView({ ob: { giftAt: 1 }, firstLight: true, ready: true }).open).toBe(false)
  })
  it('does not show the post-earn steps before first light', () => {
    expect(tourView({ ob: { tourStep: 4 }, firstLight: false, ready: true }).step).toBe(STEP_SCAN)
  })
})

describe('tourView in Demo mode', () => {
  it('does not open by itself in Demo mode', () => {
    expect(tourView({ ob: {}, firstLight: false, ready: true, demo: true }).open).toBe(false)
    expect(tourView({ ob: { tourStep: 2 }, firstLight: false, ready: true, demo: true }).open).toBe(false)
  })
  it('opens in Demo mode after 選單「新手引導」(tourDismissedAt = 0)', () => {
    expect(tourView({ ob: { tourStep: 2, tourDismissedAt: 0 }, firstLight: false, ready: true, demo: true })).toEqual({ open: true, step: STEP_SCAN, needsInit: false })
    expect(tourView({ ob: reopenPatch({}), firstLight: false, ready: true, demo: true }).open).toBe(true)
  })
})

describe('firstLightCelebration', () => {
  const base = { ready: true, firstLight: true, tourOnCelebrate: false }
  it('shows a dialog once when the tour is not on the celebration step (dismissed, Demo mode)', () => {
    expect(firstLightCelebration(base)).toBe('dialog')
    expect(firstLightCelebration({ ...base, celebratedAt: 1 })).toBe('none')
  })
  it('only marks it when the tour sheet is drawing the celebration', () => {
    expect(firstLightCelebration({ ...base, tourOnCelebrate: true })).toBe('mark')
  })
  it('waits for first light and for the user doc', () => {
    expect(firstLightCelebration({ ...base, firstLight: false })).toBe('none')
    expect(firstLightCelebration({ ...base, ready: false })).toBe('none')
  })
})

describe('reopenPatch', () => {
  it('clears the dismissal with 0 (not undefined, which a cloud merge would ignore) and keeps the step', () => {
    expect(reopenPatch({ tourStep: 2, tourDismissedAt: 99 })).toEqual({ tourDismissedAt: 0, tourStep: 2 })
  })
  it('starts over when the tour was finished or never started', () => {
    expect(reopenPatch({ tourStep: STEP_DONE })).toEqual({ tourDismissedAt: 0, tourStep: STEP_INTRO })
    expect(reopenPatch({})).toEqual({ tourDismissedAt: 0, tourStep: STEP_INTRO })
  })
  it('makes a dismissed tour visible again at the saved step', () => {
    const ob = { tourStep: 2, tourDismissedAt: 99 }
    expect(tourView({ ob, firstLight: false, ready: true }).open).toBe(false)
    const next = { ...ob, ...reopenPatch(ob) }
    expect(tourView({ ob: next, firstLight: false, ready: true })).toMatchObject({ open: true, step: STEP_SCAN })
  })
})

describe('isStandalone', () => {
  const mm = (matches: boolean) => ({ matchMedia: () => ({ matches }) })
  it('detects display-mode: standalone', () => {
    expect(isStandalone(mm(true))).toBe(true)
    expect(isStandalone(mm(false))).toBe(false)
  })
  it('detects iOS navigator.standalone', () => {
    expect(isStandalone({ ...mm(false), navigator: { standalone: true } })).toBe(true)
    expect(isStandalone({ ...mm(false), navigator: { standalone: false } })).toBe(false)
  })
  it('is false when nothing is available or matchMedia throws', () => {
    expect(isStandalone({})).toBe(false)
    expect(isStandalone({ matchMedia: () => { throw new Error('x') } })).toBe(false)
  })
})

describe('shouldRecordHomeScreen', () => {
  it('needs standalone, a ready user doc and no earlier record', () => {
    expect(shouldRecordHomeScreen({ standalone: true, ready: true })).toBe(true)
    expect(shouldRecordHomeScreen({ standalone: false, ready: true })).toBe(false)
    expect(shouldRecordHomeScreen({ standalone: true, ready: false })).toBe(false)
    expect(shouldRecordHomeScreen({ standalone: true, ready: true, homeScreenAt: 5 })).toBe(false)
  })
})

describe('installPlatform', () => {
  const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  const iphoneChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
  const iphoneLine = iphoneSafari + ' Line/14.0.0'
  const androidChrome = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
  const ipadSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'
  const p = (ua: string, touch = 0) => installPlatform(ua, inAppBrowser(ua) !== null, touch)
  it('classifies browsers', () => {
    expect(p(iphoneSafari)).toBe('ios-safari')
    expect(p(iphoneChrome)).toBe('ios-other')
    expect(p(iphoneLine)).toBe('in-app')
    expect(p(androidChrome)).toBe('android')
    expect(p(ipadSafari, 5)).toBe('ios-safari')
    expect(p(desktop)).toBe('other')
  })
})
