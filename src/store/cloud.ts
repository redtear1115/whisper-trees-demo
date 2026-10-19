// 雲端後端：用 onSnapshot 把 Firestore 鏡射成 store 的 State，寫入用 batch，格式要和 firestore.rules 一字不差。
// 對外只有 index.ts 會用；元件只認 store 的 API。
//
// 資料對應（State 欄位 ← 來源）
//   wishes            ← wishes（使用者許願）＋ wishOverrides（示範許願的狀態歷程）＋ wishStats.water
//   reports           ← reports（公開欄位）＋ reports/{id}/private/note（自己的；承辦人看全部）
//   whispers          ← users/{uid}/whispers
//   checkins/watered/myWishIds ← users/{uid}
//   ext.gm            ← config/gm        ext.vendor ← vendorOrders
//   ext.ledger/inventory/onboarding ← users/{uid}   ext.opinions ← notices/notice-1/opinions/{uid}
// `seen` 只留在本機（index.ts 管），不上雲端。
// 非承辦人在後台的改動只寫 overlay（本機），見 overlay.ts。

import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { dayKey } from '../lib/seed'
import { getAuthSnap, getFirebase, signOutAndWipe, startAuth, subscribeAuth } from '../lib/firebase'
import { emptyOverlay, loadOverlay, OVERLAY_KEY, saveOverlay, type Overlay } from './overlay'
import { SEED } from './seedData'
import { getSession, setSession } from './session'
import { LEGACY_REPORT_DETAILS, TAIPEI_DISTRICTS, WISH_REASONS, type Checkin, type StatusEvent, type TreeReport, type Whisper, type Wish } from './types'
import type { State } from './index'
import { checkMigration, runMigration } from './migrate'

const LIMIT = 500
/** 規則只接受這些公告的意見 */
const NOTICE_IDS = ['notice-1']
const UNAVAILABLE_GRACE_MS = 30_000

export interface Host {
  onState(s: State): void
  onFallback(reason: string): void
}

interface CloudWish {
  id: string
  pitId: string | null
  lngLat: [number, number]
  road: string
  district: string
  reasons: string[]
  feasibility: Wish['feasibility']
  createdAt: number
  history: StatusEvent[]
}

interface UserDoc {
  checkins: Checkin[]
  watered: Record<string, string[]>
  myWishIds: string[]
  myReportIds: string[]
  ledger: unknown[] | undefined
  inventory: unknown | undefined
  /** 新手引導旗標；map 欄位，setDoc merge 會逐欄合併 */
  onboarding: unknown | undefined
}

const emptyUser = (): UserDoc => ({
  checkins: [], watered: {}, myWishIds: [], myReportIds: [], ledger: undefined, inventory: undefined, onboarding: undefined,
})

// ---------- 模型 ----------

let host: Host
let db: Firestore
let stopped = true
let uid: string | null = null
let uidWaiters: ((uid: string) => void)[] = []
let shared: Unsubscribe[] = []
let userSubs: Unsubscribe[] = []
let unavailableTimer: ReturnType<typeof setTimeout> | undefined

let wishDocs: Record<string, CloudWish> = {}
let overrides: Record<string, StatusEvent[]> = {}
let stats: Record<string, number> = {}
let publicReports: TreeReport[] = []
let notes: Record<string, string> = {}
const noteTried = new Set<string>()
let vendorDocs: Record<string, unknown> = {}
let gmDoc: unknown
let opinions: Record<string, string> = {}
let userDoc: UserDoc = emptyUser()
let whisperRows: { id: string; treeId: string; text: string; at: number; migrated?: boolean }[] = []
let overlay: Overlay = emptyOverlay()
/** 規則擋下的澆水（今天已經澆過）：畫面上要維持「已澆好」 */
const forcedWatered = new Set<string>()

let S: State = { checkins: [], whispers: {}, wishes: {}, myWishIds: [], watered: {}, seen: {}, reports: [], ext: {} }

const overlayOn = () => getSession().admin !== 'yes'
const isAdmin = () => getSession().admin === 'yes'

function commit() {
  if (!stopped) host.onState(S)
}

const ms = (v: unknown): number =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : Date.now()

/** 去掉 undefined，避免 arrayUnion／Set 裡的物件被 Firestore 拒絕 */
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null))

function normEvent(e: DocumentData): StatusEvent {
  return { status: e.status, at: ms(e.at), ...(e.reason ? { reason: e.reason as string } : {}) }
}

// ---------- 由模型組出 State ----------

function rebuildWishes() {
  const out: Record<string, Wish> = {}
  const extra = (id: string): StatusEvent[] => (overlayOn() ? (overlay.wishEvents[id] ?? []) : [])
  for (const w of SEED) {
    const ov = overrides[w.id]
    const water = stats[w.id] ?? 0
    const more = extra(w.id)
    if (ov || water || more.length) out[w.id] = { ...w, water, history: [...(ov ?? w.history), ...more] }
  }
  for (const w of Object.values(wishDocs)) {
    out[w.id] = {
      id: w.id,
      pitId: w.pitId,
      lngLat: w.lngLat,
      road: w.road,
      district: w.district,
      reasons: w.reasons,
      feasibility: w.feasibility,
      createdAt: w.createdAt,
      seedWater: 0,
      water: stats[w.id] ?? 0,
      history: [...w.history, ...extra(w.id)],
      mock: false,
    }
  }
  S = { ...S, wishes: out }
}

function rebuildReports() {
  const mine = new Set(userDoc.myReportIds)
  S = { ...S, reports: publicReports.map((r) => ({ ...r, note: notes[r.id] ?? '', mine: mine.has(r.id) })) }
}

function rebuildUser() {
  const watered: Record<string, string[]> = { ...userDoc.watered }
  for (const key of forcedWatered) {
    const [wid, day] = key.split('|')
    if (!(watered[wid] ?? []).includes(day)) watered[wid] = [...(watered[wid] ?? []), day]
  }
  S = { ...S, checkins: userDoc.checkins, watered, myWishIds: userDoc.myWishIds }
}

function rebuildWhispers() {
  const by: Record<string, Whisper[]> = {}
  for (const r of [...whisperRows].sort((a, b) => a.at - b.at)) (by[r.treeId] ??= []).push({ text: r.text, at: r.at })
  S = { ...S, whispers: by }
}

let vendorMemo: { a: unknown; b: unknown; use: boolean; out: Record<string, unknown> } | null = null
function mergedVendor(): Record<string, unknown> {
  const use = overlayOn()
  if (vendorMemo && vendorMemo.a === vendorDocs && vendorMemo.b === overlay.vendor && vendorMemo.use === use) return vendorMemo.out
  const out = use ? { ...vendorDocs, ...overlay.vendor } : vendorDocs
  vendorMemo = { a: vendorDocs, b: overlay.vendor, use, out }
  return out
}

function rebuildExt() {
  const ext: Record<string, unknown> = {
    gm: overlayOn() && overlay.gm !== undefined ? overlay.gm : gmDoc,
    vendor: mergedVendor(),
    ledger: userDoc.ledger,
    inventory: userDoc.inventory,
    onboarding: userDoc.onboarding,
    opinions,
    ledgerOverlay: overlay.ledger,
    ...overlay.ext,
  }
  S = { ...S, ext }
}

function rebuildAll() {
  rebuildWishes()
  rebuildReports()
  rebuildUser()
  rebuildWhispers()
  rebuildExt()
  commit()
}

// ---------- 監聽 ----------

/**
 * 長時間連不上 Firestore（上線卻一直沒有來自伺服器的快照）就退回本機模式。
 * 真的離線（navigator.onLine === false）不算：離線時照常用快取，留言先存著、恢復後同步。
 */
function armUnavailable() {
  unavailableTimer ??= setTimeout(() => {
    unavailableTimer = undefined
    if (stopped) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return armUnavailable()
    fallback('firestore-unavailable')
  }, UNAVAILABLE_GRACE_MS)
}

function onListenError(e: FirestoreError) {
  if (stopped) return
  if (e.code === 'resource-exhausted') return fallback('resource-exhausted')
  if (e.code === 'unavailable') return armUnavailable()
  console.warn('[cloud] 監聽失敗', e.code)
}

function onWriteError(label: string, e: unknown) {
  const code = (e as { code?: string }).code
  if (code === 'resource-exhausted') return fallback('resource-exhausted')
  if (code === 'unavailable') return armUnavailable()
  console.warn(`[cloud] 寫入失敗 ${label}`, code ?? e)
}

function fromServer(snap: { metadata: { fromCache: boolean } }) {
  if (!snap.metadata.fromCache && unavailableTimer) {
    clearTimeout(unavailableTimer)
    unavailableTimer = undefined
  }
}

function listen(q: Query, onNext: (snap: QuerySnapshot) => void, bucket: Unsubscribe[]) {
  bucket.push(
    onSnapshot(
      q,
      (snap) => {
        if (stopped) return
        fromServer(snap)
        onNext(snap)
      },
      onListenError,
    ),
  )
}

function startShared() {
  armUnavailable()
  const col = (name: string) => collection(db, name)
  listen(
    query(col('wishes'), orderBy('createdAt', 'desc'), limit(LIMIT)),
    (snap) => {
      wishDocs = {}
      snap.forEach((d) => {
        const x = d.data({ serverTimestamps: 'estimate' })
        wishDocs[d.id] = {
          id: d.id,
          pitId: x.pitId ?? null,
          lngLat: x.lngLat,
          road: x.road ?? '',
          district: x.district ?? '',
          reasons: x.reasons ?? [],
          feasibility: x.feasibility,
          createdAt: ms(x.createdAt),
          history: (x.history ?? []).map(normEvent),
        }
      })
      rebuildWishes()
      commit()
    },
    shared,
  )
  listen(
    query(col('wishOverrides'), orderBy(documentId()), limit(LIMIT)),
    (snap) => {
      overrides = {}
      snap.forEach((d) => (overrides[d.id] = ((d.data().history ?? []) as DocumentData[]).map(normEvent)))
      rebuildWishes()
      commit()
    },
    shared,
  )
  listen(
    query(col('wishStats'), orderBy(documentId()), limit(LIMIT)),
    (snap) => {
      stats = {}
      snap.forEach((d) => (stats[d.id] = Number(d.data().water) || 0))
      rebuildWishes()
      commit()
    },
    shared,
  )
  listen(
    query(col('reports'), orderBy('at', 'desc'), limit(LIMIT)),
    (snap) => {
      const list: TreeReport[] = []
      snap.forEach((d) => {
        const x = d.data({ serverTimestamps: 'estimate' })
        list.push({
          id: d.id,
          treeId: x.treeId,
          species: x.species,
          road: x.road,
          district: x.district,
          kind: x.kind,
          details: x.details ?? [],
          note: '',
          hasPhoto: !!x.hasPhoto,
          at: ms(x.at),
        })
      })
      publicReports = list
      rebuildReports()
      commit()
      void fetchNotes()
    },
    shared,
  )
  listen(
    query(col('vendorOrders'), orderBy('at', 'desc'), limit(LIMIT)),
    (snap) => {
      const next: Record<string, unknown> = {}
      snap.forEach((d) => {
        const x = d.data()
        next[d.id] = { ...x, at: ms(x.at) }
      })
      vendorDocs = next
      rebuildExt()
      commit()
    },
    shared,
  )
  shared.push(
    onSnapshot(
      doc(db, 'config', 'gm'),
      (snap) => {
        if (stopped) return
        fromServer(snap)
        gmDoc = snap.exists() ? snap.data() : undefined
        rebuildExt()
        commit()
      },
      onListenError,
    ),
  )
}

function startUser(forUid: string) {
  userSubs.push(
    onSnapshot(
      doc(db, 'users', forUid),
      (snap) => {
        if (stopped || uid !== forUid) return
        fromServer(snap)
        // 自己還有沒送出的合併寫入時，等它送完的下一個快照再套用，避免把剛改的內容蓋掉
        if (pending) return
        const x = snap.exists() ? snap.data() : {}
        userDoc = {
          checkins: (x.checkins ?? []) as Checkin[],
          watered: (x.watered ?? {}) as Record<string, string[]>,
          myWishIds: (x.myWishIds ?? []) as string[],
          myReportIds: (x.myReportIds ?? []) as string[],
          ledger: x.ledger,
          inventory: x.inventory,
          onboarding: x.onboarding,
        }
        // 文件載入了（來自伺服器，或快取裡真的有）才算 ready；自動寫入靠它擋掉「還沒載入的空資料」
        if (!snap.metadata.fromCache || snap.exists()) setSession({ userReady: true })
        rebuildUser()
        rebuildReports()
        rebuildExt()
        commit()
        void fetchNotes()
      },
      onListenError,
    ),
  )
  listen(
    query(collection(db, 'users', forUid, 'whispers'), orderBy('at', 'desc'), limit(LIMIT)),
    (snap) => {
      whisperRows = []
      snap.forEach((d) => {
        const x = d.data({ serverTimestamps: 'estimate' })
        whisperRows.push({ id: d.id, treeId: x.treeId, text: x.text, at: ms(x.at) })
      })
      rebuildWhispers()
      commit()
    },
    userSubs,
  )
  for (const noticeId of NOTICE_IDS) {
    userSubs.push(
      onSnapshot(
        doc(db, 'notices', noticeId, 'opinions', forUid),
        (snap) => {
          if (stopped || uid !== forUid) return
          const next = { ...opinions }
          if (snap.exists()) next[noticeId] = snap.data().text as string
          else delete next[noticeId]
          opinions = next
          rebuildExt()
          commit()
        },
        onListenError,
      ),
    )
  }
}

/** 備註在 private/note：自己只讀得到自己的，承辦人讀得到全部 */
async function fetchNotes() {
  if (!uid) return
  const mine = new Set(userDoc.myReportIds)
  const ids = (isAdmin() ? publicReports.map((r) => r.id) : [...mine]).filter((x) => !noteTried.has(x) && !(x in notes))
  const forUid = uid
  for (const rid of ids) {
    noteTried.add(rid)
    try {
      const d = await getDoc(doc(db, 'reports', rid, 'private', 'note'))
      if (stopped || uid !== forUid) return
      if (d.exists()) {
        notes = { ...notes, [rid]: String(d.data().note ?? '') }
        rebuildReports()
        commit()
      }
    } catch {
      // 讀不到（不是自己的）就算了
    }
  }
}

// ---------- 登入狀態 ----------

function onAuth() {
  const a = getAuthSnap()
  if (stopped || a.status !== 'ready' || !a.uid) return
  if (a.uid !== uid) switchUser(a.uid)
  void checkAdmin(a.uid, a.google)
}

function switchUser(next: string) {
  userSubs.forEach((u) => u())
  userSubs = []
  uid = next
  userDoc = emptyUser()
  setSession({ userReady: false })
  whisperRows = []
  opinions = {}
  notes = {}
  noteTried.clear()
  if (!shared.length) startShared()
  startUser(next)
  rebuildAll()
  const waiters = uidWaiters
  uidWaiters = []
  waiters.forEach((w) => w(next))
  void checkMigration(db, next)
}

let adminSeq = 0
async function checkAdmin(forUid: string, google: boolean) {
  const seq = ++adminSeq
  const set = (admin: 'yes' | 'no' | 'checking') => {
    if (getSession().admin === admin) return
    setSession({ admin })
    rebuildAll()
    noteTried.clear()
    void fetchNotes()
  }
  if (!google) return set('no')
  if (getSession().admin !== 'yes') set('checking')
  try {
    const d = await getDoc(doc(db, 'admins', forUid))
    if (seq === adminSeq && !stopped) set(d.exists() ? 'yes' : 'no')
  } catch {
    if (seq === adminSeq && !stopped) set('no')
  }
}

function awaitUid(): Promise<string> {
  return uid ? Promise.resolve(uid) : new Promise((r) => uidWaiters.push(r))
}

// ---------- 啟動／停止／退回本機 ----------

let unsubAuth: (() => void) | null = null

export function startCloud(h: Host) {
  host = h
  ;({ db } = getFirebase())
  stopped = false
  overlay = loadOverlay()
  window.addEventListener('storage', onOverlayStorage)
  unsubAuth = subscribeAuth(onAuth)
  startAuth(() => fallback('auth-failed'))
  onAuth()
}

function onOverlayStorage(e: StorageEvent) {
  if (e.key && e.key !== OVERLAY_KEY) return
  overlay = loadOverlay()
  rebuildAll()
}

export function stopCloud() {
  stopped = true
  shared.forEach((u) => u())
  userSubs.forEach((u) => u())
  shared = []
  userSubs = []
  unsubAuth?.()
  unsubAuth = null
  clearTimeout(unavailableTimer)
  unavailableTimer = undefined
  window.removeEventListener('storage', onOverlayStorage)
}

function fallback(reason: string) {
  if (stopped) return
  console.warn('[cloud] 退回本機模式：', reason)
  stopCloud()
  host.onFallback(reason)
}

// ---------- 使用者文件的合併寫入（同一個 tick 內的多個動作合成一次 setDoc） ----------

interface Pending {
  checkins: Checkin[]
  myWishIds: string[]
  replace: Partial<Record<'ledger' | 'inventory' | 'onboarding', unknown>>
}
let pending: Pending | null = null

function queueUser(p: { checkins?: Checkin[]; myWishIds?: string[]; replace?: Pending['replace'] }) {
  if (!pending) {
    pending = { checkins: [], myWishIds: [], replace: {} }
    queueMicrotask(flushUser)
  }
  pending.checkins.push(...(p.checkins ?? []))
  pending.myWishIds.push(...(p.myWishIds ?? []))
  Object.assign(pending.replace, p.replace)
}

function flushUser() {
  const p = pending
  pending = null
  if (!p) return
  void awaitUid().then((u) => {
    const data: Record<string, unknown> = { ...clean(p.replace) }
    if (p.checkins.length) data.checkins = arrayUnion(...clean(p.checkins))
    if (p.myWishIds.length) data.myWishIds = arrayUnion(...p.myWishIds)
    if (!Object.keys(data).length) return
    return setDoc(doc(db, 'users', u), data, { merge: true }).catch((e) => onWriteError('users', e))
  })
}

// ---------- 寫入 ----------

export function notReady(): boolean {
  return !uid
}

export function migrate(withWhispers: boolean) {
  if (uid) void runMigration(db, uid, withWhispers)
}

export function createWish(input: Omit<Wish, 'id' | 'createdAt' | 'seedWater' | 'water' | 'history' | 'mock'>): Wish {
  if (!uid) throw new Error('not-ready')
  if (!(TAIPEI_DISTRICTS as readonly string[]).includes(input.district)) throw new Error('district')
  const reasons = input.reasons.filter((r) => (WISH_REASONS as readonly string[]).includes(r))
  if (!reasons.length) throw new Error('reasons')
  const now = Date.now()
  const wishId = input.pitId ? `pit-${input.pitId}` : `spot-${uid}-${now}`
  const feasibility = input.pitId ? 'emptyPit' : 'needsSurvey'
  const history: StatusEvent[] = [{ status: 'received', at: now }]
  const road = input.road.slice(0, 40)
  const wish: Wish = { ...input, id: wishId, road, reasons, feasibility, createdAt: now, seedWater: 0, water: 0, history, mock: false }

  wishDocs = { ...wishDocs, [wishId]: { id: wishId, pitId: input.pitId, lngLat: input.lngLat, road, district: input.district, reasons, feasibility, createdAt: now, history } }
  userDoc = { ...userDoc, myWishIds: [...userDoc.myWishIds, wishId] }
  rebuildWishes()
  rebuildUser()
  commit()

  const owner = uid
  const batch = writeBatch(db)
  batch.set(doc(db, 'wishes', wishId), {
    pitId: input.pitId,
    lngLat: input.lngLat,
    road,
    district: input.district,
    reasons,
    feasibility,
    createdAt: serverTimestamp(),
    createdBy: owner,
    history,
  })
  batch.set(doc(db, 'users', owner), { myWishIds: arrayUnion(wishId) }, { merge: true })
  batch.commit().catch((e) => onWriteError('createWish', e))
  return wish
}

/** 澆水：同一個 batch 寫 waterings/{uid_日期}、wishStats +1、自己的 watered 清單。 */
export function waterWish(wishId: string) {
  const day = dayKey()
  userDoc = { ...userDoc, watered: { ...userDoc.watered, [wishId]: [...(userDoc.watered[wishId] ?? []), day] } }
  rebuildUser()
  commit()
  void awaitUid().then((u) => {
    const batch = writeBatch(db)
    batch.set(doc(db, 'wishes', wishId, 'waterings', `${u}_${day}`), { at: serverTimestamp() })
    // 一定要 merge：沒有 merge 的 set 會把整份文件換掉，increment 從 0 起算，第二個人起都會被規則擋下
    batch.set(doc(db, 'wishStats', wishId), { water: increment(1) }, { merge: true })
    batch.set(doc(db, 'users', u), { watered: { [wishId]: arrayUnion(day) } }, { merge: true })
    return batch.commit().catch(async (e) => {
      onWriteError('waterWish', e)
      if ((e as { code?: string }).code !== 'permission-denied') return
      // 伺服器拒絕：如果自己今天真的澆過（例如另一台裝置），畫面維持「已澆好」；
      // 否則撤回剛才的樂觀更新，並告訴使用者沒有存到
      const mine = await getDoc(doc(db, 'wishes', wishId, 'waterings', `${u}_${day}`)).catch(() => null)
      if (mine?.exists()) {
        forcedWatered.add(`${wishId}|${day}`)
      } else {
        const days = (userDoc.watered[wishId] ?? []).filter((d) => d !== day)
        userDoc = { ...userDoc, watered: { ...userDoc.watered, [wishId]: days } }
        window.dispatchEvent(new CustomEvent('wt:write-failed', { detail: '澆水沒有存到雲端，請再試一次。' }))
      }
      rebuildUser()
      commit()
    })
  })
}

function saveOverlayAndRebuild() {
  saveOverlay(overlay)
  rebuildAll()
}

/** 狀態歷程寫進 batch：使用者許願改 wishes/{id}，示範許願改 wishOverrides/{id} */
function writeHistory(batch: ReturnType<typeof writeBatch>, wish: Wish, history: StatusEvent[]) {
  const data = clean(history)
  if (wish.mock) batch.set(doc(db, 'wishOverrides', wish.id), { history: data, updatedAt: serverTimestamp() })
  else batch.update(doc(db, 'wishes', wish.id), { history: data })
  if (wish.mock) overrides = { ...overrides, [wish.id]: history }
  else if (wishDocs[wish.id]) wishDocs = { ...wishDocs, [wish.id]: { ...wishDocs[wish.id], history } }
  rebuildWishes()
}

export function setWishStatus(wish: Wish, event: StatusEvent) {
  if (overlayOn()) {
    overlay = { ...overlay, wishEvents: { ...overlay.wishEvents, [wish.id]: [...(overlay.wishEvents[wish.id] ?? []), event] } }
    saveOverlayAndRebuild()
    return
  }
  const batch = writeBatch(db)
  writeHistory(batch, wish, [...wish.history, event])
  commit()
  batch.commit().catch((e) => onWriteError('setWishStatus', e))
}

/** 發包商推進工單；完工時許願狀態改「已種植」在同一個 batch。 */
export function advanceOrder(orderId: string, order: Record<string, unknown>, done?: { wish: Wish; event: StatusEvent }) {
  if (overlayOn()) {
    overlay = { ...overlay, vendor: { ...overlay.vendor, [orderId]: order } }
    if (done) overlay = { ...overlay, wishEvents: { ...overlay.wishEvents, [done.wish.id]: [...(overlay.wishEvents[done.wish.id] ?? []), done.event] } }
    saveOverlayAndRebuild()
    return
  }
  const batch = writeBatch(db)
  batch.set(doc(db, 'vendorOrders', orderId), clean(order))
  vendorDocs = { ...vendorDocs, [orderId]: order }
  if (done) writeHistory(batch, done.wish, [...done.wish.history, done.event])
  rebuildExt()
  rebuildWishes()
  commit()
  batch.commit().catch((e) => onWriteError('advanceOrder', e))
}

export function recordCheckin(c: Checkin) {
  const item = clean(c)
  userDoc = { ...userDoc, checkins: [...userDoc.checkins, item] }
  rebuildUser()
  commit()
  queueUser({ checkins: [item] })
}

export function addWhisper(treeId: string, text: string) {
  const at = Date.now()
  whisperRows = [...whisperRows, { id: `tmp-${at}`, treeId, text, at }]
  rebuildWhispers()
  commit()
  void awaitUid().then((u) =>
    setDoc(doc(collection(db, 'users', u, 'whispers')), { treeId: treeId.slice(0, 20), text, at: serverTimestamp() }).catch((e) =>
      onWriteError('addWhisper', e),
    ),
  )
}

const ALLOWED_DETAILS = new Set(LEGACY_REPORT_DETAILS)

export function addReport(r: Omit<TreeReport, 'id' | 'at'>): TreeReport {
  if (!uid) throw new Error('not-ready')
  const owner = uid
  const ref = doc(collection(db, 'reports'))
  const details = r.details.filter((d) => ALLOWED_DETAILS.has(d)).slice(0, 3)
  const report: TreeReport = { ...r, details, id: ref.id, at: Date.now(), mine: true }
  const batch = writeBatch(db)
  batch.set(ref, {
    treeId: r.treeId.slice(0, 20),
    species: r.species.slice(0, 20),
    road: r.road.slice(0, 40),
    district: r.district,
    kind: r.kind,
    details,
    hasPhoto: r.hasPhoto,
    at: serverTimestamp(),
  })
  if (r.note) batch.set(doc(db, 'reports', ref.id, 'private', 'note'), { note: r.note, createdBy: owner })
  batch.set(doc(db, 'users', owner), { myReportIds: arrayUnion(ref.id) }, { merge: true })

  publicReports = [{ ...report, note: '' }, ...publicReports]
  if (r.note) notes = { ...notes, [ref.id]: r.note }
  userDoc = { ...userDoc, myReportIds: [...userDoc.myReportIds, ref.id] }
  rebuildReports()
  commit()
  batch.commit().catch((e) => onWriteError('addReport', e))
  return report
}

/** 光點、造型、GM 設定、工單、意見：store 的 ext 寫入。 */
export function setExt(key: string, value: unknown) {
  switch (key) {
    case 'ledger':
    case 'inventory':
    case 'onboarding':
      userDoc = { ...userDoc, [key]: value }
      rebuildExt()
      commit()
      queueUser({ replace: { [key]: value } })
      return
    // 對外 API 的模擬（用戶端、呼叫紀錄、回報處理）：不管是不是承辦人都只存本機覆寫層，沒有 Firestore 規則
    case 'apiClients':
    case 'apiLog':
    case 'reportReviews':
      overlay = { ...overlay, ext: { ...overlay.ext, [key]: value } }
      saveOverlayAndRebuild()
      return
    case 'ledgerOverlay':
      overlay = { ...overlay, ledger: value as unknown[] }
      saveOverlayAndRebuild()
      return
    case 'gm':
      if (overlayOn()) {
        overlay = { ...overlay, gm: value }
        saveOverlayAndRebuild()
      } else {
        gmDoc = value
        rebuildExt()
        commit()
        setDoc(doc(db, 'config', 'gm'), clean(value)).catch((e) => onWriteError('gm', e))
      }
      return
    case 'opinions': {
      const next = value as Record<string, string>
      for (const noticeId of Object.keys(next)) {
        if (next[noticeId] === opinions[noticeId]) continue
        const text = next[noticeId]
        void awaitUid().then((u) =>
          setDoc(doc(db, 'notices', noticeId, 'opinions', u), { text, at: serverTimestamp() }).catch((e) => onWriteError('opinion', e)),
        )
      }
      opinions = next
      rebuildExt()
      commit()
      return
    }
    default:
      S = { ...S, ext: { ...S.ext, [key]: value } }
      commit()
  }
}

/** 清除自己在雲端的資料（樹洞與使用者文件），再登出並清掉本機快取。 */
export async function resetCloud() {
  const owner = uid
  const database = db
  stopCloud()
  if (owner) {
    const rows = await getDocs(query(collection(database, 'users', owner, 'whispers'), limit(LIMIT)))
    const batch = writeBatch(database)
    rows.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(database, 'users', owner))
    await batch.commit()
    for (const noticeId of NOTICE_IDS) await deleteDoc(doc(database, 'notices', noticeId, 'opinions', owner)).catch(() => {})
  }
  await signOutAndWipe()
}

/** 登出（不刪資料） */
export async function signOutCloud() {
  stopCloud()
  await signOutAndWipe()
}
