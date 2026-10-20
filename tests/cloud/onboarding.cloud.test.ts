// @vitest-environment jsdom
// Cloud store + onboarding persistence against the local Firebase emulators (Auth + Firestore,
// project demo-whisper-trees). Runs through `npm run test:rules` only; never touches the real project.
// Each boot() loads a fresh copy of the store, like a page reload, with the same anonymous login
// (kept in jsdom localStorage) so the uid survives a "restart".
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, getApps } from 'firebase/app'
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const PROJECT_ID = 'demo-whisper-trees'
let env: RulesTestEnvironment

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port: Number(port), rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8') },
  })
})
afterAll(async () => {
  await env?.cleanup()
})

type Boot = Awaited<ReturnType<typeof boot>>
let current: Boot | null = null

async function boot() {
  vi.resetModules()
  vi.stubEnv('MODE', 'development')
  vi.stubEnv('VITE_FIREBASE_EMULATOR', '1')
  const store = await import('../../src/store')
  const cloud = await import('../../src/store/cloud')
  const fb = await import('../../src/lib/firebase')
  const ledger = await import('../../src/features/game/ledger')
  const inv = await import('../../src/features/game/inventory')
  const ob = await import('../../src/features/game/onboarding')
  await vi.waitFor(() => expect(store.userReady()).toBe(true), { timeout: 10000 })
  const uid = fb.getAuthSnap().uid!
  expect(uid).toBeTruthy()
  current = { store, cloud, ledger, inv, ob, uid }
  return current
}

async function shutdown() {
  if (!current) return
  current.cloud.stopCloud()
  current = null
  await Promise.all(getApps().filter((a) => a.name === '[DEFAULT]').map((a) => deleteApp(a)))
}

async function serverDoc(uid: string) {
  let data: Record<string, any> | undefined
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore() as unknown as Firestore, 'users', uid))).data()
  })
  return data
}

const seedDoc = (uid: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users', uid), data, { merge: true })
  })

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  await env.clearFirestore()
})
afterEach(async () => {
  await shutdown()
  vi.unstubAllEnvs()
})

describe('onboarding in the cloud store', () => {
  it('becomes ready once the user doc has loaded (boot waits for it)', async () => {
    const a = await boot()
    expect(a.store.getState().ext.onboarding).toBeUndefined()
    expect(a.store.userReady()).toBe(true)
  })

  it('granting the gift leaves a server inventory it never saw untouched, and inventory() shows both', async () => {
    const a = await boot()
    // The server gets an inventory the client has not received yet (stale client)
    await seedDoc(a.uid, { inventory: { owned: ['frame-spring'], equipped: {}, civic: {} } })
    a.ledger.award('checkin', 'T1', new Date('2026-10-19T12:00:00+08:00'))
    expect(a.ob.grantStarterGift()).toBe(true)
    await vi.waitFor(async () => {
      const d = await serverDoc(a.uid)
      expect(d?.onboarding?.giftAt).toBeGreaterThan(0)
      expect(d?.ledger?.length).toBeGreaterThan(0)
    }, { timeout: 10000 })
    const d = await serverDoc(a.uid)
    expect(d?.inventory).toEqual({ owned: ['frame-spring'], equipped: {}, civic: {} })
    await vi.waitFor(() => expect(a.inv.inventory().owned.sort()).toEqual(['frame-spring', 'hat-acorn']), { timeout: 10000 })
  })

  it('flags survive a restart of the cloud store', async () => {
    const a = await boot()
    a.ob.patchOnboarding({ tourStep: 2, tourDismissedAt: 5 })
    a.ob.patchOnboarding({ homeScreenAt: 7 })
    await vi.waitFor(async () => expect((await serverDoc(a.uid))?.onboarding?.homeScreenAt).toBe(7), { timeout: 10000 })
    await shutdown()

    const b = await boot()
    expect(b.uid).toBe(a.uid)
    await vi.waitFor(() => expect(b.store.getExt('onboarding', {})).toEqual({ tourStep: 2, tourDismissedAt: 5, homeScreenAt: 7 }), { timeout: 10000 })
  })

  it('a standalone write keeps the fields already on the server', async () => {
    const a = await boot()
    await seedDoc(a.uid, { onboarding: { tourDismissedAt: 5 } })
    await vi.waitFor(() => expect(a.ob.onboarding().tourDismissedAt).toBe(5), { timeout: 10000 })
    a.ob.patchOnboarding({ homeScreenAt: 9 })
    await vi.waitFor(async () => expect((await serverDoc(a.uid))?.onboarding).toEqual({ tourDismissedAt: 5, homeScreenAt: 9 }), { timeout: 10000 })
  })

  it('a stale client (has not received tourDismissedAt yet) still keeps it on the server', async () => {
    const a = await boot()
    await seedDoc(a.uid, { onboarding: { tourDismissedAt: 5 } })
    a.ob.patchOnboarding({ homeScreenAt: 9 })
    await vi.waitFor(async () => expect((await serverDoc(a.uid))?.onboarding).toEqual({ tourDismissedAt: 5, homeScreenAt: 9 }), { timeout: 10000 })
  })

  it('reopening the tour from the menu clears the dismissal on the server (0, since a merge ignores undefined) and keeps the step', async () => {
    const a = await boot()
    const { reopenPatch, tourView } = await import('../../src/features/onboarding/tour')
    await seedDoc(a.uid, { onboarding: { tourStep: 2, tourDismissedAt: 5 } })
    await vi.waitFor(() => expect(a.ob.onboarding().tourDismissedAt).toBe(5), { timeout: 10000 })
    a.ob.patchOnboarding(reopenPatch(a.ob.onboarding()))
    await vi.waitFor(async () => expect((await serverDoc(a.uid))?.onboarding).toEqual({ tourStep: 2, tourDismissedAt: 0 }), { timeout: 10000 })
    expect(tourView({ ob: a.ob.onboarding(), firstLight: false, ready: true })).toMatchObject({ open: true, step: 2 })
  })
})

describe('diary (moods on interactions) in the cloud store', () => {
  it('saves to users/{uid}.diary, survives a restart, and clearing a mood removes the entry on the server', async () => {
    const a = await boot()
    const d = await import('../../src/features/journal/diary')
    await d.pickMood('checkin', 'T1', 1000, 'calm')
    await d.recordTouch('T1', 'hug', 2000)
    await vi.waitFor(async () => expect((await serverDoc(a.uid))?.diary?.entries).toHaveLength(2), { timeout: 10000 })
    await d.pickMood('checkin', 'T1', 1000, null)
    await vi.waitFor(
      async () => expect((await serverDoc(a.uid))?.diary?.entries).toEqual([{ kind: 'touch', treeId: 'T1', at: 2000, touch: 'hug' }]),
      { timeout: 10000 },
    )
    await shutdown()

    const b = await boot()
    const d2 = await import('../../src/features/journal/diary')
    await vi.waitFor(() => expect(d2.diary().entries).toEqual([{ kind: 'touch', treeId: 'T1', at: 2000, touch: 'hug' }]), { timeout: 10000 })
    expect(b.uid).toBe(a.uid)
  })
})
