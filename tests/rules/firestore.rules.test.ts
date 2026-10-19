// Firestore Security Rules tests. Run with `npm run test:rules`, which starts the
// local emulator (project demo-whisper-trees) and stops it afterwards. These tests
// never talk to the real Firebase project.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'demo-whisper-trees'
const ADMIN = 'test-admin'

let env: RulesTestEnvironment

function emulatorHost(): { host: string; port: number } {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')
  return { host, port: Number(port) }
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      ...emulatorHost(),
      rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await seed({ [`admins/${ADMIN}`]: {} })
})

// ---------- helpers ----------

const db = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore
const alice = () => db('alice')
const bob = () => db('bob')
const admin = () => db(ADMIN)

async function seed(docs: Record<string, Record<string, unknown>>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore() as unknown as Firestore
    for (const [path, data] of Object.entries(docs)) await setDoc(doc(fs, path), data)
  })
}

/** Calendar day in Asia/Taipei, the same key the rules compute from request.time. */
function taipeiDay(ms = Date.now()): string {
  return new Date(ms + 8 * 3600_000).toISOString().slice(0, 10)
}

/** Avoid a flaky result when a test straddles Taipei midnight (16:00 UTC). */
async function awayFromTaipeiMidnight() {
  const dayMs = 24 * 3600_000
  const msToMidnight = dayMs - ((Date.now() + 8 * 3600_000) % dayMs)
  if (msToMidnight < 5000) await new Promise((r) => setTimeout(r, msToMidnight + 1000))
}

function pitWish(uid: string, pitId = 'TP-0001') {
  return {
    pitId,
    lngLat: [121.5436, 25.0330],
    road: '仁愛路四段',
    district: '大安區',
    reasons: ['通學', '太曬'],
    feasibility: 'emptyPit',
    createdAt: serverTimestamp(),
    createdBy: uid,
    history: [{ status: 'received', at: Date.now() }],
  }
}

function spotWish(uid: string) {
  return { ...pitWish(uid), pitId: null, feasibility: 'needsSurvey' }
}

/** A wish document as it would sit in the database (for seeding). */
function storedWish(uid: string, pitId = 'TP-0001') {
  return { ...pitWish(uid, pitId), createdAt: Timestamp.now() }
}

function validReport() {
  return {
    treeId: 'SL0560111023',
    species: '樟樹',
    road: '敦化南路一段',
    district: '大安區',
    kind: 'pruning',
    details: ['修剪過度', '枝葉擋路'],
    hasPhoto: false,
    at: serverTimestamp(),
  }
}

function whisper(text = '今天的樹很安靜。') {
  return { treeId: 'SL0560111023', text, at: serverTimestamp() }
}

/** Watering batch: today's watering doc plus wishStats set to `water`. */
function waterBatch(fs: Firestore, uid: string, wishId: string, water: number, wid = `${uid}_${taipeiDay()}`) {
  const b = writeBatch(fs)
  b.set(doc(fs, `wishes/${wishId}/waterings/${wid}`), { at: serverTimestamp() })
  b.set(doc(fs, `wishStats/${wishId}`), { water })
  return b
}

// =====================================================================
// Permissions
// =====================================================================

describe('permissions', () => {
  it('denies a user creating admins/{self}', async () => {
    await assertFails(setDoc(doc(alice(), 'admins/alice'), {}))
  })

  it('denies even an admin writing to admins', async () => {
    await assertFails(setDoc(doc(admin(), 'admins/alice'), {}))
  })

  it("denies get of someone else's admins doc", async () => {
    await assertFails(getDoc(doc(alice(), `admins/${ADMIN}`)))
  })

  it('denies list of admins', async () => {
    await assertFails(getDocs(query(collection(alice(), 'admins'), limit(10))))
    await assertFails(getDocs(query(collection(admin(), 'admins'), limit(10))))
  })

  it('allows an admin to get their own admins doc', async () => {
    await assertSucceeds(getDoc(doc(admin(), `admins/${ADMIN}`)))
  })

  it("denies writing someone else's users/{uid}", async () => {
    await assertFails(setDoc(doc(alice(), 'users/bob'), { checkins: [] }))
  })

  it("denies get of someone else's users/{uid}", async () => {
    await seed({ 'users/bob': { checkins: [] } })
    await assertFails(getDoc(doc(alice(), 'users/bob')))
  })

  it('denies list of users', async () => {
    await assertFails(getDocs(query(collection(alice(), 'users'), limit(10))))
  })

  it('allows a user to read and write their own users/{uid}', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { checkins: [], myWishIds: [] }))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')))
  })

  it("denies get of someone else's whisper", async () => {
    await seed({ 'users/bob/whispers/w1': { treeId: 'T1', text: '秘密', at: Timestamp.now() } })
    await assertFails(getDoc(doc(alice(), 'users/bob/whispers/w1')))
  })

  it("denies list of someone else's whispers", async () => {
    await assertFails(getDocs(query(collection(alice(), 'users/bob/whispers'), limit(10))))
  })

  it("denies an admin reading a user's whispers", async () => {
    await seed({ 'users/bob/whispers/w1': { treeId: 'T1', text: '秘密', at: Timestamp.now() } })
    await assertFails(getDoc(doc(admin(), 'users/bob/whispers/w1')))
  })

  it('denies a whispers collection-group query (user and admin)', async () => {
    await assertFails(getDocs(query(collectionGroup(alice(), 'whispers'), limit(10))))
    await assertFails(getDocs(query(collectionGroup(admin(), 'whispers'), limit(10))))
  })

  it('denies paths that no rule matches', async () => {
    await assertFails(setDoc(doc(alice(), 'misc/x'), { a: 1 }))
    await assertFails(getDoc(doc(admin(), 'misc/x')))
  })

  const anonGets = [
    `admins/${ADMIN}`,
    'config/gm',
    'wishes/pit-TP-0001',
    'wishes/pit-TP-0001/waterings/alice_2026-10-19',
    'wishOverrides/mock-1',
    'wishStats/pit-TP-0001',
    'reports/r1',
    'reports/r1/private/note',
    'vendorOrders/v1',
    'notices/notice-1/opinions/alice',
    'users/alice',
    'users/alice/whispers/w1',
  ]
  it.each(anonGets)('denies an unauthenticated get of %s', async (path) => {
    await seed({ [path]: { a: 1, createdBy: 'alice' } })
    await assertFails(getDoc(doc(anon(), path)))
  })

  const anonLists = [
    'admins',
    'config',
    'wishes',
    'wishes/pit-TP-0001/waterings',
    'wishOverrides',
    'wishStats',
    'reports',
    'reports/r1/private',
    'vendorOrders',
    'notices/notice-1/opinions',
    'users',
    'users/alice/whispers',
  ]
  it.each(anonLists)('denies an unauthenticated list of %s', async (path) => {
    await assertFails(getDocs(query(collection(anon(), path), limit(10))))
  })

  it('denies an unauthenticated opinions collection-group query', async () => {
    await assertFails(getDocs(query(collectionGroup(anon(), 'opinions'), limit(10))))
  })
})

// =====================================================================
// Wishes
// =====================================================================

describe('wishes', () => {
  it('allows creating a valid pit wish', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'wishes/pit-TP-0001'), pitWish('alice')))
  })

  it('allows creating a valid spot wish', async () => {
    await assertSucceeds(setDoc(doc(alice(), `wishes/spot-alice-${Date.now()}`), spotWish('alice')))
  })

  it('allows a signed-in user to get a wish and list wishes with limit 500', async () => {
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
    await assertSucceeds(getDoc(doc(bob(), 'wishes/pit-TP-0001')))
    await assertSucceeds(getDocs(query(collection(bob(), 'wishes'), limit(500))))
  })

  it('denies a forged createdBy', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), pitWish('bob')))
  })

  it('denies a client-chosen createdAt', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), createdAt: Timestamp.now() }))
  })

  it('denies creating with a status other than received', async () => {
    const data = { ...pitWish('alice'), history: [{ status: 'planted', at: Date.now() }] }
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), data))
  })

  it('denies creating with more than one history entry', async () => {
    const at = Date.now()
    const data = { ...pitWish('alice'), history: [{ status: 'received', at }, { status: 'planted', at }] }
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), data))
  })

  it('denies extra keys in the history entry', async () => {
    const data = { ...pitWish('alice'), history: [{ status: 'received', at: Date.now(), reason: 'x' }] }
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), data))
  })

  it('denies creating mock-1', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/mock-1'), spotWish('alice')))
    await assertFails(setDoc(doc(alice(), 'wishes/mock-1'), { ...pitWish('alice'), pitId: '1' }))
  })

  it('denies a pit wish whose id is not pit-<pitId>', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-9999'), pitWish('alice', 'TP-0001')))
    await assertFails(setDoc(doc(alice(), 'wishes/w-abc123'), pitWish('alice', 'TP-0001')))
  })

  it("denies a spot wish whose id carries someone else's uid", async () => {
    await assertFails(setDoc(doc(alice(), `wishes/spot-bob-${Date.now()}`), spotWish('alice')))
  })

  it('denies a spot wish id with nothing after the uid', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/spot-alice-'), spotWish('alice')))
  })

  it('denies a second wish on the same pit', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'wishes/pit-TP-0001'), pitWish('alice')))
    await assertFails(setDoc(doc(bob(), 'wishes/pit-TP-0001'), pitWish('bob')))
  })

  it('denies feasibility that does not follow from pitId', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), feasibility: 'needsSurvey' }))
    await assertFails(
      setDoc(doc(alice(), `wishes/spot-alice-${Date.now()}`), { ...spotWish('alice'), feasibility: 'emptyPit' }),
    )
  })

  it('denies a pitId longer than 32 characters', async () => {
    const pitId = 'P'.repeat(33)
    await assertFails(setDoc(doc(alice(), `wishes/pit-${pitId}`), pitWish('alice', pitId)))
  })

  it('denies a district outside the 12 Taipei districts', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), district: '板橋區' }))
  })

  it('denies reasons outside the list', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), reasons: ['通學', '好看'] }))
  })

  it('denies an empty reasons list', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), reasons: [] }))
  })

  it('denies coordinates outside Taipei', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), lngLat: [120.68, 24.14] }))
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), lngLat: [121.5, 25.4] }))
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), lngLat: [121.5] }))
  })

  it('denies a road longer than 40 characters', async () => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), road: '路'.repeat(41) }))
  })

  it.each([
    ['seedWater', 99],
    ['water', 99],
    ['mock', true],
  ])('denies the extra field %s', async (field, value) => {
    await assertFails(setDoc(doc(alice(), 'wishes/pit-TP-0001'), { ...pitWish('alice'), [field]: value }))
  })

  it('denies a non-admin updating a wish', async () => {
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
    await assertFails(
      updateDoc(doc(alice(), 'wishes/pit-TP-0001'), {
        history: [{ status: 'received', at: 1 }, { status: 'planted', at: 2 }],
      }),
    )
  })

  it('denies a non-admin deleting a wish', async () => {
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
    await assertFails(deleteDoc(doc(alice(), 'wishes/pit-TP-0001')))
  })

  it('denies a non-admin writing wishOverrides', async () => {
    await assertFails(setDoc(doc(alice(), 'wishOverrides/mock-1'), { status: 'planted' }))
  })

  it('allows an admin to change a wish status', async () => {
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
    await assertSucceeds(
      updateDoc(doc(admin(), 'wishes/pit-TP-0001'), {
        history: [{ status: 'received', at: 1 }, { status: 'surveying', at: 2 }],
      }),
    )
  })

  it('allows an admin to delete a wish', async () => {
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
    await assertSucceeds(deleteDoc(doc(admin(), 'wishes/pit-TP-0001')))
  })

  it('allows an admin to write wishOverrides, and a user to read them', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'wishOverrides/mock-1'), { status: 'planted' }))
    await assertSucceeds(getDoc(doc(alice(), 'wishOverrides/mock-1')))
  })
})

// =====================================================================
// Watering
// =====================================================================

describe('watering', () => {
  beforeEach(async () => {
    await awayFromTaipeiMidnight()
    await seed({ 'wishes/pit-TP-0001': storedWish('alice') })
  })

  it('allows the first watering of the day with wishStats created at 1 in the same batch', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
  })

  it('allows the first watering of the day with wishStats +1 in the same batch', async () => {
    await seed({ 'wishStats/pit-TP-0001': { water: 7 } })
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 8).commit())
  })

  it('allows two different users to water the same wish on the same day', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertSucceeds(waterBatch(bob(), 'bob', 'pit-TP-0001', 2).commit())
  })

  // 與 app（src/store/cloud.ts waterWish）完全相同的寫法：increment(1) 搭配 merge
  function appWaterBatch(fs: Firestore, uid: string, wishId: string, merge = true) {
    const b = writeBatch(fs)
    b.set(doc(fs, `wishes/${wishId}/waterings/${uid}_${taipeiDay()}`), { at: serverTimestamp() })
    if (merge) b.set(doc(fs, `wishStats/${wishId}`), { water: increment(1) }, { merge: true })
    else b.set(doc(fs, `wishStats/${wishId}`), { water: increment(1) })
    return b
  }

  it('allows two different users to water with the app write (increment + merge), counting 2', async () => {
    await assertSucceeds(appWaterBatch(alice(), 'alice', 'pit-TP-0001').commit())
    await assertSucceeds(appWaterBatch(bob(), 'bob', 'pit-TP-0001').commit())
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), 'wishStats/pit-TP-0001'))
      expect(snap.data()?.water).toBe(2)
    })
  })

  it('allows a second user on a demo wish with the app write', async () => {
    await assertSucceeds(appWaterBatch(alice(), 'alice', 'mock-3').commit())
    await assertSucceeds(appWaterBatch(bob(), 'bob', 'mock-3').commit())
  })

  it('denies the non-merge increment write once wishStats exists (regression guard)', async () => {
    await assertSucceeds(appWaterBatch(alice(), 'alice', 'pit-TP-0001').commit())
    await assertFails(appWaterBatch(bob(), 'bob', 'pit-TP-0001', false).commit())
  })

  it('denies a second app-style watering by the same user on the same day', async () => {
    await assertSucceeds(appWaterBatch(alice(), 'alice', 'pit-TP-0001').commit())
    await assertFails(appWaterBatch(alice(), 'alice', 'pit-TP-0001').commit())
  })

  it('allows watering the demo wish mock-2', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'mock-2', 1).commit())
  })

  it('allows a user to get their own watering', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertSucceeds(getDoc(doc(alice(), `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`)))
  })

  it("denies get of someone else's watering", async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertFails(getDoc(doc(bob(), `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`)))
  })

  it('denies a second watering on the same day with the same id', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 2).commit())
  })

  it('denies a second watering on the same day with a changed suffix', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 2, `alice_${taipeiDay()}-2`).commit())
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 2, `alice_${taipeiDay()}x`).commit())
  })

  it('denies a watering keyed to a day other than today (Taipei)', async () => {
    const yesterday = taipeiDay(Date.now() - 24 * 3600_000)
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 1, `alice_${yesterday}`).commit())
  })

  it("denies a watering id that uses someone else's uid", async () => {
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 1, `bob_${taipeiDay()}`).commit())
  })

  it('denies wishStats +1 without a watering in the same batch', async () => {
    await assertFails(setDoc(doc(alice(), 'wishStats/pit-TP-0001'), { water: 1 }))
    await seed({ 'wishStats/pit-TP-0001': { water: 3 } })
    await assertFails(setDoc(doc(alice(), 'wishStats/pit-TP-0001'), { water: 4 }))
  })

  it('denies wishStats +1 in a batch with an already existing watering', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertFails(setDoc(doc(alice(), 'wishStats/pit-TP-0001'), { water: 2 }))
  })

  it('denies a watering without a wishStats change in the same batch', async () => {
    await assertFails(
      setDoc(doc(alice(), `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`), { at: serverTimestamp() }),
    )
  })

  it('denies wishStats +2', async () => {
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 2).commit())
    await seed({ 'wishStats/pit-TP-0001': { water: 3 } })
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 5).commit())
  })

  it('denies wishStats set to some other value (lower or unchanged)', async () => {
    await seed({ 'wishStats/pit-TP-0001': { water: 3 } })
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 0).commit())
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 3).commit())
    await assertFails(waterBatch(alice(), 'alice', 'pit-TP-0001', 3.5).commit())
  })

  it('denies extra fields on wishStats or on the watering', async () => {
    const fs = alice()
    const b1 = writeBatch(fs)
    b1.set(doc(fs, `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`), { at: serverTimestamp() })
    b1.set(doc(fs, 'wishStats/pit-TP-0001'), { water: 1, hot: true })
    await assertFails(b1.commit())
    const b2 = writeBatch(fs)
    b2.set(doc(fs, `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`), { at: serverTimestamp(), n: 5 })
    b2.set(doc(fs, 'wishStats/pit-TP-0001'), { water: 1 })
    await assertFails(b2.commit())
  })

  it('denies a watering with a client-chosen time', async () => {
    const fs = alice()
    const b = writeBatch(fs)
    b.set(doc(fs, `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`), { at: Timestamp.now() })
    b.set(doc(fs, 'wishStats/pit-TP-0001'), { water: 1 })
    await assertFails(b.commit())
  })

  it('denies watering a wish that does not exist and is not mock-N', async () => {
    await assertFails(waterBatch(alice(), 'alice', 'pit-NOPE', 1).commit())
    await assertFails(waterBatch(alice(), 'alice', 'mock-abc', 1).commit())
    await assertFails(waterBatch(alice(), 'alice', 'mock-', 1).commit())
  })

  it('denies list of waterings', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    await assertFails(getDocs(query(collection(alice(), 'wishes/pit-TP-0001/waterings'), limit(10))))
    await assertFails(getDocs(query(collection(admin(), 'wishes/pit-TP-0001/waterings'), limit(10))))
  })

  it('denies updating or deleting a watering', async () => {
    await assertSucceeds(waterBatch(alice(), 'alice', 'pit-TP-0001', 1).commit())
    const ref = doc(alice(), `wishes/pit-TP-0001/waterings/alice_${taipeiDay()}`)
    await assertFails(updateDoc(ref, { at: serverTimestamp() }))
    await assertFails(deleteDoc(ref))
  })

  it('denies a non-admin deleting wishStats, allows an admin', async () => {
    await seed({ 'wishStats/pit-TP-0001': { water: 3 } })
    await assertFails(deleteDoc(doc(alice(), 'wishStats/pit-TP-0001')))
    await assertSucceeds(deleteDoc(doc(admin(), 'wishStats/pit-TP-0001')))
  })

  it('allows a signed-in user to read wishStats', async () => {
    await seed({ 'wishStats/pit-TP-0001': { water: 3 } })
    await assertSucceeds(getDoc(doc(bob(), 'wishStats/pit-TP-0001')))
    await assertSucceeds(getDocs(query(collection(bob(), 'wishStats'), limit(500))))
  })
})

// =====================================================================
// Reports
// =====================================================================

describe('reports', () => {
  function reportWithNote(fs: Firestore, uid: string, id = 'r1', note = '樹枝快碰到公車站牌。') {
    const b = writeBatch(fs)
    b.set(doc(fs, `reports/${id}`), validReport())
    b.set(doc(fs, `reports/${id}/private/note`), { note, createdBy: uid })
    return b
  }

  it('allows a valid report with its private note in the same batch', async () => {
    await assertSucceeds(reportWithNote(alice(), 'alice').commit())
  })

  it('allows a valid report without a note', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), validReport()))
  })

  it('allows a signed-in user to read reports (list with limit)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), validReport()))
    await assertSucceeds(getDoc(doc(bob(), 'reports/r1')))
    await assertSucceeds(getDocs(query(collection(bob(), 'reports'), limit(500))))
  })

  it('denies a report that carries createdBy', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), createdBy: 'alice' }))
  })

  it('denies a report that carries a note', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), note: '電話 0912…' }))
  })

  it('denies a report with a client-chosen time', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), at: Timestamp.now() }))
  })

  it('denies a kind outside the list', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), kind: 'fire' }))
  })

  it('denies details outside the list', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), details: ['修剪過度', '很醜'] }))
  })

  it('denies more than 3 details', async () => {
    const details = ['修剪過度', '遮蔭過多', '枝葉擋路', '病蟲害']
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), details }))
  })

  it('denies a district outside Taipei and oversized text fields', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), district: '板橋區' }))
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), treeId: 'T'.repeat(21) }))
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), species: '樹'.repeat(21) }))
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), road: '路'.repeat(41) }))
    await assertFails(setDoc(doc(alice(), 'reports/r1'), { ...validReport(), hasPhoto: 'yes' }))
  })

  it('denies a private note longer than 140 characters', async () => {
    await assertFails(reportWithNote(alice(), 'alice', 'r1', '字'.repeat(141)).commit())
  })

  it('denies a private note with a forged createdBy', async () => {
    const fs = alice()
    const b = writeBatch(fs)
    b.set(doc(fs, 'reports/r1'), validReport())
    b.set(doc(fs, 'reports/r1/private/note'), { note: '備註', createdBy: 'bob' })
    await assertFails(b.commit())
  })

  it('denies a private doc id other than note', async () => {
    const fs = alice()
    const b = writeBatch(fs)
    b.set(doc(fs, 'reports/r1'), validReport())
    b.set(doc(fs, 'reports/r1/private/extra'), { note: '備註', createdBy: 'alice' })
    await assertFails(b.commit())
  })

  it('denies adding a note to an existing report outside its creating batch', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), validReport()))
    await assertFails(setDoc(doc(bob(), 'reports/r1/private/note'), { note: '搶先寫', createdBy: 'bob' }))
  })

  it('denies a note for a report that does not exist', async () => {
    await assertFails(setDoc(doc(alice(), 'reports/r9/private/note'), { note: '備註', createdBy: 'alice' }))
  })

  it("denies reading someone else's private note", async () => {
    await assertSucceeds(reportWithNote(alice(), 'alice').commit())
    await assertFails(getDoc(doc(bob(), 'reports/r1/private/note')))
  })

  it('allows the author and an admin to read the private note', async () => {
    await assertSucceeds(reportWithNote(alice(), 'alice').commit())
    await assertSucceeds(getDoc(doc(alice(), 'reports/r1/private/note')))
    await assertSucceeds(getDoc(doc(admin(), 'reports/r1/private/note')))
  })

  it('denies the author updating or deleting the private note', async () => {
    await assertSucceeds(reportWithNote(alice(), 'alice').commit())
    await assertFails(updateDoc(doc(alice(), 'reports/r1/private/note'), { note: '改' }))
    await assertFails(deleteDoc(doc(alice(), 'reports/r1/private/note')))
  })

  it('denies a non-admin updating or deleting a report', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), validReport()))
    await assertFails(updateDoc(doc(alice(), 'reports/r1'), { kind: 'sick' }))
    await assertFails(deleteDoc(doc(alice(), 'reports/r1')))
  })

  it('allows an admin to update and delete a report', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reports/r1'), validReport()))
    await assertSucceeds(updateDoc(doc(admin(), 'reports/r1'), { kind: 'sick' }))
    await assertSucceeds(deleteDoc(doc(admin(), 'reports/r1')))
  })
})

// =====================================================================
// Opinions, config, vendor orders, list limits
// =====================================================================

describe('opinions', () => {
  const opinion = (text = '支持在這裡種樹') => ({ text, at: serverTimestamp() })

  it('allows a user to write and read their own opinion', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion()))
    await assertSucceeds(getDoc(doc(alice(), 'notices/notice-1/opinions/alice')))
    await assertSucceeds(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion('改一下')))
  })

  it("denies reading someone else's opinion", async () => {
    await assertSucceeds(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion()))
    await assertFails(getDoc(doc(bob(), 'notices/notice-1/opinions/alice')))
    await assertFails(getDocs(query(collection(bob(), 'notices/notice-1/opinions'), limit(10))))
    await assertFails(getDocs(query(collectionGroup(bob(), 'opinions'), limit(10))))
  })

  it("denies writing an opinion under someone else's uid", async () => {
    await assertFails(setDoc(doc(alice(), 'notices/notice-1/opinions/bob'), opinion()))
  })

  it('denies an opinion on a noticeId that is not in the list', async () => {
    await assertFails(setDoc(doc(alice(), 'notices/notice-2/opinions/alice'), opinion()))
  })

  it('denies an empty or 141-character opinion and extra fields', async () => {
    await assertFails(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion('')))
    await assertFails(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion('字'.repeat(141))))
    await assertFails(
      setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), { ...opinion(), name: '王小明' }),
    )
  })

  it('allows an admin to read any opinion, including by collection group', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'notices/notice-1/opinions/alice'), opinion()))
    await assertSucceeds(getDoc(doc(admin(), 'notices/notice-1/opinions/alice')))
    await assertSucceeds(getDocs(query(collectionGroup(admin(), 'opinions'), limit(500))))
  })

  it('allows the owner and an admin to delete an opinion, denies others', async () => {
    await seed({
      'notices/notice-1/opinions/alice': { text: 'a', at: Timestamp.now() },
      'notices/notice-1/opinions/bob': { text: 'b', at: Timestamp.now() },
    })
    await assertFails(deleteDoc(doc(bob(), 'notices/notice-1/opinions/alice')))
    await assertSucceeds(deleteDoc(doc(alice(), 'notices/notice-1/opinions/alice')))
    await assertSucceeds(deleteDoc(doc(admin(), 'notices/notice-1/opinions/bob')))
  })
})

describe('config and vendor orders', () => {
  it('denies a non-admin writing config/gm', async () => {
    await assertFails(setDoc(doc(alice(), 'config/gm'), { light: 999 }))
  })

  it('allows an admin to write config/gm and a user to read it', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'config/gm'), { light: 10 }))
    await assertSucceeds(getDoc(doc(alice(), 'config/gm')))
  })

  it('denies a non-admin writing vendorOrders', async () => {
    await assertFails(setDoc(doc(alice(), 'vendorOrders/v1'), { status: 'done' }))
  })

  it('allows an admin to write vendorOrders together with wishOverrides in one batch', async () => {
    const fs = admin()
    const b = writeBatch(fs)
    b.set(doc(fs, 'vendorOrders/v1'), { status: 'done' })
    b.set(doc(fs, 'wishOverrides/mock-1'), { status: 'planted' })
    await assertSucceeds(b.commit())
    await assertSucceeds(getDoc(doc(alice(), 'vendorOrders/v1')))
  })
})

describe('list limits', () => {
  const listable = ['wishes', 'wishOverrides', 'wishStats', 'reports', 'vendorOrders']

  it.each(listable)('denies listing %s without a limit', async (name) => {
    await assertFails(getDocs(collection(alice(), name)))
  })

  it.each(listable)('denies listing %s with limit 501', async (name) => {
    await assertFails(getDocs(query(collection(alice(), name), limit(501))))
  })

  it.each(listable)('allows listing %s with limit 500', async (name) => {
    await assertSucceeds(getDocs(query(collection(alice(), name), limit(500))))
  })

  it('allows querying your own private notes by createdBy with a limit', async () => {
    const fs = alice()
    const b = writeBatch(fs)
    b.set(doc(fs, 'reports/r1'), validReport())
    b.set(doc(fs, 'reports/r1/private/note'), { note: '備註', createdBy: 'alice' })
    await assertSucceeds(b.commit())
    await assertSucceeds(
      getDocs(query(collection(fs, 'reports/r1/private'), where('createdBy', '==', 'alice'), limit(1))),
    )
  })
})

// =====================================================================
// Whispers (tree hollow)
// =====================================================================

describe('whispers', () => {
  it('allows the owner to create and read their own whisper', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper()))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/whispers/w1')))
    await assertSucceeds(getDocs(query(collection(alice(), 'users/alice/whispers'), limit(50))))
  })

  it('allows the owner to delete their own whisper', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper()))
    await assertSucceeds(deleteDoc(doc(alice(), 'users/alice/whispers/w1')))
  })

  it('denies updating a whisper', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper()))
    await assertFails(updateDoc(doc(alice(), 'users/alice/whispers/w1'), { text: '改寫' }))
  })

  it("denies creating a whisper in someone else's tree hollow", async () => {
    await assertFails(setDoc(doc(alice(), 'users/bob/whispers/w1'), whisper()))
  })

  it('allows a whisper of 140 Chinese characters', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper('樹'.repeat(140))))
  })

  it('denies a whisper of 141 characters', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper('樹'.repeat(141))))
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w2'), whisper('a'.repeat(141))))
  })

  it('denies an empty whisper', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper('')))
  })

  it('allows a whisper that contains emoji', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper('謝謝你的樹蔭 🌳☀️')))
  })

  // Rules `string.size()` (verified on the emulator) counts UTF-16 code units, the
  // same as JS `String.length` and a textarea's maxLength: a CJK character counts 1,
  // an emoji outside the BMP (🌳) counts 2, a ZWJ sequence counts all its units.
  it('counts size in UTF-16 code units: 70 x 🌳 (length 140) allowed', async () => {
    const text = '🌳'.repeat(70)
    expect(text.length).toBe(140)
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper(text)))
  })

  it('counts size in UTF-16 code units: 71 x 🌳 (length 142) denied', async () => {
    const text = '🌳'.repeat(71)
    expect([...text].length).toBeLessThan(140)
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper(text)))
  })

  it('allows a 140-length whisper mixing Chinese and emoji', async () => {
    const text = '樹'.repeat(136) + '🌳☀️' // 136 + 2 + 2 = 140 code units
    expect(text.length).toBe(140)
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), whisper(text)))
  })

  it('denies extra fields and a client-chosen time without migrated', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), { ...whisper(), mood: 'sad' }))
    await assertFails(
      setDoc(doc(alice(), 'users/alice/whispers/w2'), { ...whisper(), at: Timestamp.fromMillis(Date.now() - 86400_000) }),
    )
  })

  it('denies a treeId longer than 20 characters', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), { ...whisper(), treeId: 'T'.repeat(21) }))
  })

  it('allows a migrated whisper with a past time', async () => {
    const data = { ...whisper(), at: Timestamp.fromMillis(Date.now() - 7 * 86400_000), migrated: true }
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/whispers/w1'), data))
  })

  it('denies a migrated whisper with a future time or a non-timestamp time', async () => {
    const future = { ...whisper(), at: Timestamp.fromMillis(Date.now() + 86400_000), migrated: true }
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), future))
    const number = { ...whisper(), at: Date.now() - 1000, migrated: true }
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w2'), number))
  })

  it('denies a past time with migrated set to something other than true', async () => {
    const data = { ...whisper(), at: Timestamp.fromMillis(Date.now() - 86400_000), migrated: 'yes' }
    await assertFails(setDoc(doc(alice(), 'users/alice/whispers/w1'), data))
  })
})

// =====================================================================
// taipeiDay(): the real helper from firestore.rules, evaluated at fixed instants.
// The watering tests above can only exercise "now", where the UTC and Taipei dates
// usually agree; this checks the +8 h shift and the zero padding directly.
// =====================================================================

describe('taipeiDay() in firestore.rules', () => {
  let dayEnv: RulesTestEnvironment

  beforeAll(async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8')
    const pad2 = src.match(/function pad2\(n\) \{[\s\S]*?\n {4}\}/)?.[0]
    const day = src.match(/function taipeiDay\(\) \{[\s\S]*?\n {4}\}/)?.[0]
    if (!pad2 || !day || !day.includes('request.time')) throw new Error('taipeiDay()/pad2() not found in firestore.rules')
    const dayAt = day.replace('function taipeiDay()', 'function taipeiDayAt(t0)').replaceAll('request.time', 't0')
    dayEnv = await initializeTestEnvironment({
      projectId: `${PROJECT_ID}-day`,
      firestore: {
        ...emulatorHost(),
        rules: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    ${pad2}
    ${dayAt}
    match /probe/{id} {
      allow create: if taipeiDayAt(request.resource.data.t) == request.resource.data.day;
    }
  }
}`,
      },
    })
  })

  afterAll(async () => {
    await dayEnv?.cleanup()
  })

  it.each([
    ['2026-10-19T15:59:59Z', '2026-10-19'],
    ['2026-10-19T16:00:00Z', '2026-10-20'],
    ['2026-01-04T16:00:00Z', '2026-01-05'],
    ['2026-12-31T16:30:00Z', '2027-01-01'],
    ['2026-02-28T16:00:00Z', '2026-03-01'],
  ])('maps %s to Taipei day %s', async (iso, expected) => {
    const fs = dayEnv.authenticatedContext('alice').firestore() as unknown as Firestore
    const t = Timestamp.fromDate(new Date(iso))
    expect(taipeiDay(t.toMillis())).toBe(expected) // the client-side helper agrees
    await assertSucceeds(setDoc(doc(fs, `probe/${iso}`), { t, day: expected }))
    // A wrong day: the unshifted UTC date where it differs, otherwise the next day.
    const utcDay = iso.slice(0, 10)
    const wrong = utcDay === expected ? taipeiDay(t.toMillis() + 24 * 3600_000) : utcDay
    await assertFails(setDoc(doc(fs, `probe/${iso}-wrong`), { t, day: wrong }))
  })
})
