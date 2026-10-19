import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECKIN, DEMO } from '../../config'
import { demoHintSeen, dismissDemoHint, exitDemoMode, getDemoPosition, parseDemoPosition, setDemoPosition } from '../../store'
import { currentDemoPosition } from '../demoPosition'
import { judgeCheckin, offsetNorth, type LngLat } from '../geo'

/** Vitest 跑在 node，沒有 sessionStorage：換一個最小的替身 */
function stubSession() {
  const data = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
  })
  return data
}

const tree: LngLat = [121.5287, 25.0335]

beforeEach(() => void stubSession())
afterEach(() => vi.unstubAllGlobals())

describe('demo position (store, sessionStorage)', () => {
  it('is null until the avatar is moved', () => {
    expect(getDemoPosition()).toBeNull()
  })
  it('round-trips a position', () => {
    setDemoPosition([121.52871234, 25.03361234])
    expect(getDemoPosition()).toEqual([121.52871234, 25.03361234])
  })
  it('notifies subscribers-free readers via sessionStorage only (no localStorage)', () => {
    setDemoPosition(tree)
    expect(sessionStorage.getItem('whisper-trees:demo-pos')).toBe(tree.join(','))
  })
  it('exitDemoMode resets position and the one-time hint', () => {
    setDemoPosition(tree)
    dismissDemoHint()
    expect(demoHintSeen()).toBe(true)
    exitDemoMode()
    expect(getDemoPosition()).toBeNull()
    expect(demoHintSeen()).toBe(false)
  })
  it('ignores garbage', () => {
    expect(parseDemoPosition(null)).toBeNull()
    expect(parseDemoPosition('nope')).toBeNull()
    expect(parseDemoPosition('121.5')).toBeNull()
  })
  it('does not throw when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => setDemoPosition(tree)).not.toThrow()
    expect(getDemoPosition()).toBeNull()
    expect(demoHintSeen()).toBe(false)
  })
})

describe('demo scan judges with the simulated position', () => {
  const judge = async (treeAt: LngLat, remark = '') => {
    const pos = await currentDemoPosition()
    return { pos, result: judgeCheckin(treeAt, remark, pos) }
  }
  it('uses CHECKIN.demoAccuracy', async () => {
    setDemoPosition(tree)
    expect((await currentDemoPosition()).accuracy).toBe(CHECKIN.demoAccuracy)
  })
  it('near the tree: success', async () => {
    setDemoPosition(offsetNorth(tree, 10))
    expect((await judge(tree)).result.kind).toBe('success')
  })
  it('far from the tree (even in Demo): too far, with the real distance', async () => {
    setDemoPosition(offsetNorth(tree, 60))
    const { result } = await judge(tree)
    expect(result.kind).toBe('tooFar')
    expect(result.kind === 'tooFar' && Math.round(result.distance)).toBe(60)
  })
  it('median-strip trees keep the far-view rule from the simulated position', async () => {
    setDemoPosition(offsetNorth(tree, 60))
    expect((await judge(tree, '信義路二段北側安全島')).result.kind).toBe('farView')
  })
  it('the stored position wins over the demo tree', async () => {
    setDemoPosition([121.5, 25.0])
    expect((await currentDemoPosition()).lngLat).toEqual([121.5, 25.0])
    expect(DEMO.center).not.toEqual([121.5, 25.0])
  })
})
