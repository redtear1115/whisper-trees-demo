// @vitest-environment jsdom
// 連不上雲端時的連線狀態，對本機 Firebase emulator（demo-whisper-trees）。只經 `npm run test:rules` 跑。
// 不退回離線模式。到期時先問伺服器，問不到只顯示狀態、一直重連；在背景不算。
import { deleteApp, getApps } from 'firebase/app'
import { disableNetwork, enableNetwork } from 'firebase/firestore'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function boot() {
  vi.resetModules()
  vi.stubEnv('MODE', 'development')
  vi.stubEnv('VITE_FIREBASE_EMULATOR', '1')
  const store = await import('../../src/store')
  const cloud = await import('../../src/store/cloud')
  const session = await import('../../src/store/session')
  const fb = await import('../../src/lib/firebase')
  await vi.waitFor(() => expect(store.userReady()).toBe(true), { timeout: 10000 })
  return { store, cloud, session, fb }
}

let stop: (() => void) | null = null
afterEach(async () => {
  stop?.()
  stop = null
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  await Promise.all(getApps().filter((a) => a.name === '[DEFAULT]').map((a) => deleteApp(a)))
})

describe('unavailable → connection status (never local mode)', () => {
  it('server reachable when the grace runs out: stays in cloud mode', async () => {
    const { cloud, session } = await boot()
    stop = cloud.stopCloud
    cloud._armUnavailableForTest(10)
    await new Promise((r) => setTimeout(r, 1500))
    expect(session.getSession().backend).toBe('cloud')
    expect(session.getSession().connection).toBe('ok')
  })

  it('page in the background: the expired grace does not fall back (only re-arms on visible; full 30 s re-arm is not waited for here)', async () => {
    const { cloud, session } = await boot()
    stop = cloud.stopCloud
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    cloud._armUnavailableForTest(10)
    await new Promise((r) => setTimeout(r, 300))
    expect(session.getSession().connection).toBe('ok')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 300))
    expect(session.getSession().backend).toBe('cloud')
    expect(session.getSession().connection).toBe('ok')
  })

  it('server unreachable: shows reconnecting, stays in cloud mode, and recovers when the network is back', async () => {
    const { cloud, session, fb } = await boot()
    stop = cloud.stopCloud
    const { db } = fb.getFirebase()
    await disableNetwork(db)
    cloud._armUnavailableForTest(10)
    await vi.waitFor(() => expect(session.getSession().connection).toBe('reconnecting'), { timeout: 5000 })
    expect(session.getSession().backend).toBe('cloud')
    await enableNetwork(db)
    // 下一次問伺服器（8 秒後）或伺服器的快照就恢復
    await vi.waitFor(() => expect(session.getSession().connection).toBe('ok'), { timeout: 15000 })
    expect(session.getSession().backend).toBe('cloud')
  }, 20000)
})
