// 所有資料存取都經過這個模組。目前存在 localStorage；日後換 Supabase 只改這一層。
// 同一台電腦的兩個分頁靠 storage 事件即時同步（市民端 ↔ 政府端）。

import { useSyncExternalStore } from 'react'
import seedWishes from '../mock/wishes.json'
import capsules from '../mock/capsules.json'
import { CHECKIN } from '../config'
import { dayKey } from '../lib/seed'
import type { Checkin, ReportKind, StatusEvent, TreeReport, Whisper, Wish, WishStatus } from './types'

const KEY = 'whisper-trees:v1'
const DAY = 86_400_000

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
    if (e.key === KEY || e.key === null) {
      state = read()
      emit()
    }
  })
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

export function resetAll() {
  write(emptyState())
}

// ---------- 示範許願 ----------

interface SeedWish {
  id: string
  pitId: string | null
  lngLat: [number, number]
  road: string
  district: string
  reasons: string[]
  feasibility: Wish['feasibility']
  daysAgo: number
  seedWater: number
  history: (string | number)[][]
}

const seedNow = Date.now()
const SEED: Wish[] = (seedWishes as SeedWish[]).map((w) => ({
  id: w.id,
  pitId: w.pitId,
  lngLat: w.lngLat,
  road: w.road,
  district: w.district,
  reasons: w.reasons,
  feasibility: w.feasibility,
  createdAt: seedNow - w.daysAgo * DAY,
  seedWater: w.seedWater,
  water: 0,
  history: w.history.map(([status, days, reason]) => ({
    status: status as WishStatus,
    at: seedNow - (days as number) * DAY,
    ...(reason ? { reason: reason as string } : {}),
  })),
  mock: true,
}))

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

export function createWish(input: Omit<Wish, 'id' | 'createdAt' | 'seedWater' | 'water' | 'history' | 'mock'>): Wish {
  const existing = input.pitId ? wishByPit(input.pitId) : undefined
  if (existing) return existing
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
  update((s) => ({ ...s, wishes: { ...s.wishes, [wishId]: { ...wish, history: [...wish.history, event] } } }))
  return true
}

export function markSeen(wishId: string) {
  const wish = allWishes().find((w) => w.id === wishId)
  if (!wish || state.seen[wishId] === wish.history.length) return
  update((s) => ({ ...s, seen: { ...s.seen, [wishId]: wish.history.length } }))
}

// ---------- 打卡與樹洞 ----------

export function recordCheckin(treeId: string, result: Checkin['result']) {
  update((s) => ({ ...s, checkins: [...s.checkins, { treeId, result, at: Date.now() }] }))
}

/** 最近一次（30 分鐘內）在這棵樹的打卡，重新整理樹的頁面時用來維持現場狀態 */
export function recentCheckin(treeId: string, s: State = state): Checkin | undefined {
  const since = Date.now() - CHECKIN.sessionMinutes * 60_000
  return [...s.checkins].reverse().find((c) => c.treeId === treeId && c.at >= since)
}

const capsuleSeed = capsules as unknown as Record<string, { text: string; daysAgo: number }>

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

export function addReport(r: { treeId: string; road: string; district: string; kind: ReportKind; note: string }) {
  const report: TreeReport = { ...r, id: `r-${Date.now().toString(36)}`, at: Date.now() }
  update((s) => ({ ...s, reports: [...s.reports, report] }))
}

// ---------- 延伸功能共用的擴充欄位 ----------

export function getExt<T>(key: string, fallback: T, s: State = state): T {
  return (s.ext[key] as T) ?? fallback
}

export function setExt<T>(key: string, value: T) {
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
  } catch {
    // ignore
  }
}
