// 所有資料存取都經過這個模組；元件只認這裡的 API（同步讀取、useStore 選取器）。
// 兩個後端，API 完全一樣：
//   - 雲端（Firebase：匿名登入＋Firestore，見 cloud.ts）：有 VITE_FIREBASE_*（或 VITE_FIREBASE_EMULATOR=1）時啟用。
//     讀取靠 onSnapshot 鏡射成下面的 State，寫入先樂觀更新記憶體、再用 batch 寫 Firestore（格式需符合 firestore.rules）。
//     `seen`（提示點）只存在這台裝置，不上雲端。
//   - localStorage：沒有 Firebase 設定、或 Vitest 時使用。同一台電腦的兩個分頁靠 storage 事件即時同步。
//     雲端模式連不上（登入失敗、Firestore 斷線、額度用完）不會退回這裡：
//     頂端顯示連線狀態（session.connection）並一直重連，這段時間的寫入由 Firestore 排著、連回來同步。
// 非承辦人在後台（/gov、/vendor、/gm）的改動只寫本機覆寫層（overlay.ts），不進雲端。

import { useMemo, useSyncExternalStore } from 'react'
import { CHECKIN } from '../config'
import type { LngLat } from '../lib/geo'
import { dayKey } from '../lib/seed'
import { firebaseEnabled } from '../lib/firebase'
import * as cloud from './cloud'
import { OVERLAY_KEY } from './overlay'
import { LOCAL_KEY, pruneBackup } from './migrate'
import { capsuleSeed, DAY, SEED, seedNow, SEED_REPORTS } from './seedData'
import { setSession, useSession } from './session'
import { normalizeReportKind, type Checkin, type ReportKind, type StatusEvent, type TreeReport, type Whisper, type Wish, type WishStatus } from './types'

export { useSession, canWriteAdmin, inDemoOverlay, userReady } from './session'
export { clearActiveTour, getActiveTour, parseActiveTour, setActiveTour, useActiveTour } from './activeTour'
export type { ActiveTour, ActiveTourStop } from './activeTour'

const KEY = LOCAL_KEY
const SEEN_KEY = 'whisper-trees:seen'

export interface State {
  checkins: Checkin[]
  whispers: Record<string, Whisper[]>
  /** 這台裝置新增或改過的許願；示範許願沒改過時不在這裡 */
  wishes: Record<string, Wish>
  myWishIds: string[]
  /** wishId → 澆過水的日子 */
  watered: Record<string, string[]>
  /** wishId → 上次看過的狀態數，用來顯示提示點 */
  seen: Record<string, number>
  reports: TreeReport[]
  ext: Record<string, unknown>
}

function emptyState(): State {
  return { checkins: [], whispers: {}, wishes: {}, myWishIds: [], watered: {}, seen: {}, reports: [], ext: {} }
}

const storage: Storage | null = (() => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
})()

function read(): State {
  try {
    const raw = storage?.getItem(KEY)
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
  } catch {
    return emptyState()
  }
}

let state = read()
const listeners = new Set<() => void>()

/** 雲端模式 */
let cloudOn = false
let seen: Record<string, number> = {}

function emit() {
  listeners.forEach((l) => l())
}

function write(next: State) {
  state = next
  try {
    storage?.setItem(KEY, JSON.stringify(next))
  } catch {
    // 私密模式或空間不足：只留在記憶體
  }
  emit()
}

function update(fn: (s: State) => State) {
  write(fn(state))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!cloudOn && (e.key === KEY || e.key === null)) {
      state = read()
      emit()
    }
  })
}

function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(storage?.getItem(SEEN_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** 提示點的「看過幾個狀態」：本機模式跟著整份 State，雲端模式只存在這台裝置 */
function setSeen(patch: Record<string, number>) {
  if (!cloudOn) return update((s) => ({ ...s, seen: { ...s.seen, ...patch } }))
  seen = { ...seen, ...patch }
  try {
    storage?.setItem(SEEN_KEY, JSON.stringify(seen))
  } catch {
    // ignore
  }
  state = { ...state, seen }
  emit()
}

function startCloud() {
  cloudOn = true
  seen = loadSeen()
  state = { ...emptyState(), seen }
  setSession({ backend: 'cloud', connection: 'ok', userReady: false })
  cloud.startCloud({
    onState(s) {
      state = { ...s, seen }
      emit()
    },
    onConnection(connection) {
      setSession({ connection })
    },
  })
}

if (firebaseEnabled && typeof window !== 'undefined') {
  pruneBackup()
  startCloud()
}

/** 目前這個 uid 的使用者文件載入了沒（本機模式一律 true）；React 元件用這個 hook */
export function useUserReady(): boolean {
  return useSession().userReady
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getState() {
  return state
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

/** 清除這台裝置的資料。雲端模式：刪掉自己的樹洞與使用者文件、登出並重新載入。 */
export function resetAll() {
  if (cloudOn) {
    for (const k of [KEY, SEEN_KEY, OVERLAY_KEY]) {
      try {
        storage?.removeItem(k)
      } catch {
        // ignore
      }
    }
    void cloud.resetCloud()
    return
  }
  write(emptyState())
}

// ---------- 示範許願（資料在 seedData.ts） ----------

let wishesCache: { src: Record<string, Wish>; list: Wish[] } | null = null

/** 示範許願 + 這台裝置的許願（改過的示範許願以裝置版本為準） */
export function allWishes(s: State = state): Wish[] {
  if (wishesCache?.src === s.wishes) return wishesCache.list
  const list = [...SEED.filter((w) => !s.wishes[w.id]), ...Object.values(s.wishes)]
  wishesCache = { src: s.wishes, list }
  return list
}

export function useWishes() {
  return useStore(allWishes)
}

export function wishStatus(w: Wish): WishStatus {
  return w.history[w.history.length - 1].status
}

export function totalWater(w: Wish): number {
  return w.seedWater + w.water
}

export function wishByPit(pitId: string): Wish | undefined {
  return allWishes().find((w) => w.pitId === pitId)
}

/** 雲端模式可能丟出 Error：'not-ready'（還沒連上）、'district'（找不到行政區）、'reasons'。 */
export function createWish(input: Omit<Wish, 'id' | 'createdAt' | 'seedWater' | 'water' | 'history' | 'mock'>): Wish {
  const existing = input.pitId ? wishByPit(input.pitId) : undefined
  if (existing) return existing
  if (cloudOn) {
    const wish = cloud.createWish(input)
    setSeen({ [wish.id]: 1 })
    return wish
  }
  const now = Date.now()
  const wish: Wish = {
    ...input,
    id: `w-${now.toString(36)}`,
    createdAt: now,
    seedWater: 0,
    water: 0,
    history: [{ status: 'received', at: now }],
    mock: false,
  }
  update((s) => ({
    ...s,
    wishes: { ...s.wishes, [wish.id]: wish },
    myWishIds: [...s.myWishIds, wish.id],
    seen: { ...s.seen, [wish.id]: 1 },
  }))
  return wish
}

export function hasWateredToday(wishId: string, s: State = state): boolean {
  return (s.watered[wishId] ?? []).includes(dayKey())
}

/** 澆水：每人每天每個許願一次。回傳 false 代表今天已經澆過。 */
export function waterWish(wishId: string): boolean {
  if (hasWateredToday(wishId)) return false
  const wish = allWishes().find((w) => w.id === wishId)
  if (!wish) return false
  if (cloudOn) {
    cloud.waterWish(wishId)
    if (state.seen[wishId] === undefined) setSeen({ [wishId]: wish.history.length })
    return true
  }
  update((s) => ({
    ...s,
    wishes: { ...s.wishes, [wishId]: { ...wish, water: wish.water + 1 } },
    watered: { ...s.watered, [wishId]: [...(s.watered[wishId] ?? []), dayKey()] },
    seen: s.seen[wishId] === undefined ? { ...s.seen, [wishId]: wish.history.length } : s.seen,
  }))
  return true
}

/** 政府端改狀態；「不可種」一定要有原因。 */
export function setWishStatus(wishId: string, status: WishStatus, reason?: string): boolean {
  const wish = allWishes().find((w) => w.id === wishId)
  if (!wish) return false
  const why = reason?.trim()
  if (status === 'rejected' && !why) return false
  if (wishStatus(wish) === status) return true
  const event: StatusEvent = { status, at: Date.now(), ...(why ? { reason: why } : {}) }
  if (cloudOn) cloud.setWishStatus(wish, event)
  else update((s) => ({ ...s, wishes: { ...s.wishes, [wishId]: { ...wish, history: [...wish.history, event] } } }))
  return true
}

/**
 * 發包商推進工單；完工的補種工單同一次寫入把許願改成「已種植」（雲端：一個 batch）。
 * 非承辦人只寫本機覆寫層。
 */
export function saveOrder(orderId: string, order: Record<string, unknown>, doneWishId?: string) {
  const wish = doneWishId ? allWishes().find((w) => w.id === doneWishId) : undefined
  if (cloudOn) {
    const done = wish && wishStatus(wish) !== 'planted' ? { wish, event: { status: 'planted', at: Date.now() } as StatusEvent } : undefined
    cloud.advanceOrder(orderId, order, done)
    return
  }
  setExt('vendor', { ...(getExt<Record<string, unknown>>('vendor', {}) as object), [orderId]: order })
  if (doneWishId) setWishStatus(doneWishId, 'planted')
}

export function markSeen(wishId: string) {
  const wish = allWishes().find((w) => w.id === wishId)
  if (!wish || state.seen[wishId] === wish.history.length) return
  setSeen({ [wishId]: wish.history.length })
}

// ---------- 打卡與樹洞 ----------

export function recordCheckin(treeId: string, result: Checkin['result'], extra: Pick<Checkin, 'species' | 'night'> = {}) {
  const checkin: Checkin = { treeId, result, at: Date.now(), ...extra }
  if (cloudOn) return cloud.recordCheckin(checkin)
  update((s) => ({ ...s, checkins: [...s.checkins, checkin] }))
}

/** 最近一次（30 分鐘內）在這棵樹的打卡，重新整理樹的頁面時用來維持現場狀態 */
export function recentCheckin(treeId: string, s: State = state): Checkin | undefined {
  const since = Date.now() - CHECKIN.sessionMinutes * 60_000
  return [...s.checkins].reverse().find((c) => c.treeId === treeId && c.at >= since)
}

/** 這棵樹的樹洞：示範膠囊 + 自己留的話（新到舊） */
export function whispersOf(treeId: string, s: State = state): Whisper[] {
  const mine = s.whispers[treeId] ?? []
  const seed = capsuleSeed[treeId]
  const demo: Whisper[] = seed ? [{ text: seed.text, at: seedNow - seed.daysAgo * DAY, mock: true }] : []
  return [...demo, ...mine].sort((a, b) => b.at - a.at)
}

export function addWhisper(treeId: string, text: string) {
  const t = text.trim().slice(0, 140)
  if (!t) return
  if (cloudOn) return cloud.addWhisper(treeId, t)
  update((s) => ({
    ...s,
    whispers: { ...s.whispers, [treeId]: [...(s.whispers[treeId] ?? []), { text: t, at: Date.now() }] },
  }))
}

export function visitedThisWeek(treeId: string, s: State = state): boolean {
  const since = Date.now() - 7 * DAY
  return s.checkins.some((c) => c.treeId === treeId && c.at >= since)
}

// ---------- 樹況回報 ----------

let reportsCache: { src: TreeReport[]; list: TreeReport[] } | null = null

/** 示範回報 + 這台裝置的回報（新到舊） */
export function allReports(s: State = state): TreeReport[] {
  if (reportsCache?.src === s.reports) return reportsCache.list
  // 舊資料（本機存的、雲端舊文件、示範資料）的類別換成新的五類
  const list = [...SEED_REPORTS, ...s.reports]
    .map((r) => ({ ...r, kind: normalizeReportKind(r.kind, r.details) }))
    .sort((a, b) => b.at - a.at)
  reportsCache = { src: s.reports, list }
  return list
}

export function useReports() {
  return useStore(allReports)
}

export function addReport(r: Omit<TreeReport, 'id' | 'at' | 'note'> & { note: string; kind: ReportKind }): TreeReport {
  const note = r.note.trim().slice(0, 140)
  if (cloudOn) return cloud.addReport({ ...r, note })
  const report: TreeReport = { ...r, note, id: `r-${Date.now().toString(36)}`, at: Date.now() }
  update((s) => ({ ...s, reports: [...s.reports, report] }))
  return report
}

// ---------- 延伸功能共用的擴充欄位 ----------

/** fallback 要傳模組層級的常數，否則 useStore 每次拿到新物件會無限重繪 */
export function getExt<T>(key: string, fallback: T, s: State = state): T {
  return (s.ext[key] as T) ?? fallback
}

export function setExt<T>(key: string, value: T) {
  if (cloudOn) return cloud.setExt(key, value)
  update((s) => ({ ...s, ext: { ...s.ext, [key]: value } }))
}

// ---------- Demo 模式 ----------

const DEMO_KEY = 'whisper-trees:demo'

export function isDemoMode(): boolean {
  try {
    if (new URLSearchParams(location.search).get('demo') === '1') {
      sessionStorage.setItem(DEMO_KEY, '1')
      return true
    }
    return sessionStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function exitDemoMode() {
  try {
    sessionStorage.removeItem(DEMO_KEY)
    sessionStorage.removeItem(DEMO_POS_KEY)
    sessionStorage.removeItem(DEMO_HINT_KEY)
  } catch {
    // ignore
  }
  demoPosListeners.forEach((l) => l())
}

// Demo 模式的模擬位置：可以拖曳地圖上的人物移動，只存在這個瀏覽器分頁（sessionStorage）。
// null = 還沒移動過，站在示範樹旁（預設位置由 src/lib/demoPosition.ts 決定）。

const DEMO_POS_KEY = 'whisper-trees:demo-pos'
const DEMO_HINT_KEY = 'whisper-trees:demo-hint-seen'
const demoPosListeners = new Set<() => void>()

/** 字串形式（"lng,lat"），給 useSyncExternalStore 當快照用；null = 沒有 */
function demoPosRaw(): string | null {
  try {
    return sessionStorage.getItem(DEMO_POS_KEY)
  } catch {
    return null
  }
}

export function parseDemoPosition(raw: string | null): LngLat | null {
  if (!raw) return null
  const [lng, lat] = raw.split(',').map(Number)
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

export function getDemoPosition(): LngLat | null {
  return parseDemoPosition(demoPosRaw())
}

export function setDemoPosition(lngLat: LngLat) {
  try {
    sessionStorage.setItem(DEMO_POS_KEY, lngLat.join(','))
  } catch {
    // ignore
  }
  demoPosListeners.forEach((l) => l())
}

/** 模擬位置；地圖跟著它更新 */
export function useDemoPosition(): LngLat | null {
  const raw = useSyncExternalStore(
    (cb) => {
      demoPosListeners.add(cb)
      return () => demoPosListeners.delete(cb)
    },
    demoPosRaw,
  )
  return useMemo(() => parseDemoPosition(raw), [raw])
}

/** 「可以拖曳牠移動位置」的提示：每個 session 只出現一次 */
export function demoHintSeen(): boolean {
  try {
    return sessionStorage.getItem(DEMO_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissDemoHint() {
  try {
    sessionStorage.setItem(DEMO_HINT_KEY, '1')
  } catch {
    // ignore
  }
}

// ---------- App 內建瀏覽器的提醒（這次瀏覽關掉就不再出現） ----------

const IN_APP_NOTICE_KEY = 'whisper-trees:in-app-notice'

export function inAppNoticeDismissed(): boolean {
  try {
    return sessionStorage.getItem(IN_APP_NOTICE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInAppNotice() {
  try {
    sessionStorage.setItem(IN_APP_NOTICE_KEY, '1')
  } catch {
    // ignore
  }
}

// ---------- 雲端帳號 ----------

/** 使用者同意後，把這台裝置舊的本機紀錄搬到雲端 */
export function migrateToCloud(withWhispers: boolean) {
  cloud.migrate(withWhispers)
}

/** 登出（雲端的紀錄不刪）；會重新載入頁面 */
export function signOutAccount() {
  void cloud.signOutCloud()
}
