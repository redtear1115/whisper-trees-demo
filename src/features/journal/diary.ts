// 我的日記：跟樹的每一次互動（打卡、摸摸樹、回報、樹洞），和當時的心情（可以不選）。
// 打卡、樹洞、回報本身各有自己的紀錄（checkins、whispers、reports），這裡只另外存兩樣東西：
//   1. 摸摸樹（呼吸、冥想、擁抱）做完的紀錄，它沒有別的地方存；
//   2. 每一次互動選的心情，用「種類 + 樹 + 互動的時間」對回那一次互動。
// 存在使用者自己的資料：ext.diary（雲端是 users/{uid}.diary 的 map 欄位，整份取代）。不用改 firestore.rules。
// 規格：docs/specs/04-tree-page.md「跟樹互動時的心情」。

import { getExt, setExt, useStore, type State } from '../../store'
import { whenUserReady } from '../../store/session'
import type { Checkin, TreeReport, Whisper } from '../../store/types'
import { changeMood, moodById, type MoodId } from '../mood/mood'

export type InteractionKind = 'checkin' | 'touch' | 'report' | 'whisper'
export type TouchId = 'breathe' | 'meditate' | 'hug'

export interface DiaryEntry {
  kind: InteractionKind
  treeId: string
  /** 那一次互動的時間（打卡、留話、回報、摸摸樹做完的那一刻） */
  at: number
  mood?: MoodId
  /** 只有摸摸樹有：做了哪一種 */
  touch?: TouchId
}

export interface Diary {
  entries: DiaryEntry[]
}

const EMPTY: Diary = { entries: [] }
/** 存太多會讓使用者文件變大；只留最新的這麼多筆 */
export const DIARY_MAX = 400
/**
 * 心情對回互動時允許的時間差。雲端的樹洞與回報用伺服器時間，和按下去那一刻差個幾秒，所以不要求完全相等；
 * 但「再說一句」兩句話可能只隔幾十秒，所以容許值要小（15 秒），而且寫入與讀出都找「最近的那一筆」。
 * 摸摸樹的時間是自己記的（recordTouch 與選心情用同一個 at），一定要完全相等，兩次擁抱隔幾秒也分得開。
 */
export const MATCH_MS = 15_000

function tolerance(kind: InteractionKind): number {
  return kind === 'touch' ? 0 : MATCH_MS
}

export function diary(s?: State): Diary {
  return getExt<Diary>('diary', EMPTY, s)
}

export function useDiary() {
  return useStore((s) => diary(s))
}

/** 同一種、同一棵樹、時間在容許值內最近的那一筆（沒有是 -1） */
function closestIndex(entries: readonly DiaryEntry[], kind: InteractionKind, treeId: string, at: number): number {
  let best = -1
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.kind !== kind || e.treeId !== treeId || Math.abs(e.at - at) > tolerance(kind)) continue
    if (best < 0 || Math.abs(e.at - at) < Math.abs(entries[best].at - at)) best = i
  }
  return best
}

/** 這一次互動選的心情（沒選是 null；存了不認得的心情也當沒選） */
export function moodOf(entries: readonly DiaryEntry[], kind: InteractionKind, treeId: string, at: number): MoodId | null {
  const e = entries[closestIndex(entries, kind, treeId, at)]
  return e?.mood && moodById(e.mood) ? e.mood : null
}

/**
 * 設定（或用 null 清掉）某一次互動的心情，回傳新的清單。純函式。
 * 摸摸樹的紀錄清掉心情時還留著（它本身就是一次互動）；其他種類沒有心情就整筆拿掉。
 */
export function withMood(entries: readonly DiaryEntry[], kind: InteractionKind, treeId: string, at: number, mood: MoodId | null): DiaryEntry[] {
  const i = closestIndex(entries, kind, treeId, at)
  if (i < 0) return mood ? trim([...entries, { kind, treeId, at, mood }]) : [...entries]
  const next = [...entries]
  if (mood) next[i] = { ...next[i], mood }
  else if (kind === 'touch') {
    const { mood: _drop, ...rest } = next[i]
    void _drop
    next[i] = rest
  } else next.splice(i, 1)
  return next
}

/** 加一筆摸摸樹（做完的那一刻）。純函式 */
export function withTouch(entries: readonly DiaryEntry[], treeId: string, touch: TouchId, at: number): DiaryEntry[] {
  return trim([...entries, { kind: 'touch', treeId, at, touch }])
}

function trim(list: DiaryEntry[]): DiaryEntry[] {
  return list.length > DIARY_MAX ? [...list].sort((a, b) => a.at - b.at).slice(-DIARY_MAX) : list
}

/**
 * 選心情：寫進日記，也當作「現在的心情」（我的 頁面那一行）。寫入前先等使用者文件載入（雲端模式），
 * 太早寫會用空的資料蓋掉雲端的。
 */
export async function pickMood(kind: InteractionKind, treeId: string, at: number, mood: MoodId | null) {
  await whenUserReady()
  setExt<Diary>('diary', { entries: withMood(diary().entries, kind, treeId, at, mood) })
  if (mood) await changeMood(mood)
}

export async function recordTouch(treeId: string, touch: TouchId, at = Date.now()) {
  await whenUserReady()
  setExt<Diary>('diary', { entries: withTouch(diary().entries, treeId, touch, at) })
}

// ---------- 我的日記的列表 ----------

export interface DiaryRow {
  kind: InteractionKind
  treeId: string
  at: number
  mood: MoodId | null
  /** 樹洞的那句話 */
  text?: string
  touch?: TouchId
  /** 打卡是遠觀 */
  farView?: boolean
}

/** 本機模式的回報都是自己的（沒有 mine 欄位）；雲端模式看 mine。示範資料不算 */
export function isMyReport(r: TreeReport): boolean {
  return r.mine === true || (r.mine === undefined && !r.mock)
}

/** 我的日記：四種互動合在一起，新到舊。示範資料（樹洞的示範膠囊、示範回報）不算 */
export function diaryRows(a: {
  checkins: readonly Checkin[]
  whispers: Record<string, readonly Whisper[]>
  reports: readonly TreeReport[]
  entries: readonly DiaryEntry[]
}): DiaryRow[] {
  const rows: DiaryRow[] = []
  const m = (kind: InteractionKind, treeId: string, at: number) => moodOf(a.entries, kind, treeId, at)
  for (const c of a.checkins) rows.push({ kind: 'checkin', treeId: c.treeId, at: c.at, mood: m('checkin', c.treeId, c.at), farView: c.result === 'farView' })
  for (const [treeId, list] of Object.entries(a.whispers))
    for (const w of list) if (!w.mock) rows.push({ kind: 'whisper', treeId, at: w.at, text: w.text, mood: m('whisper', treeId, w.at) })
  for (const r of a.reports) if (isMyReport(r)) rows.push({ kind: 'report', treeId: r.treeId, at: r.at, mood: m('report', r.treeId, r.at) })
  for (const e of a.entries) if (e.kind === 'touch') rows.push({ kind: 'touch', treeId: e.treeId, at: e.at, touch: e.touch, mood: e.mood && moodById(e.mood) ? e.mood : null })
  return rows.sort((x, y) => y.at - x.at || x.treeId.localeCompare(y.treeId))
}

export const TOUCH_NAME: Record<TouchId, string> = { breathe: '呼吸', meditate: '冥想', hug: '擁抱' }

/** 日記一列的標題：打卡／遠遠陪著它／摸摸樹・呼吸／回報了樹況／在樹洞留話 */
export function rowTitle(r: DiaryRow): string {
  switch (r.kind) {
    case 'checkin':
      return r.farView ? '遠遠陪著它' : '掃樹牌打卡'
    case 'touch':
      return r.touch ? `摸摸樹・${TOUCH_NAME[r.touch]}` : '摸摸樹'
    case 'report':
      return '回報了樹況'
    case 'whisper':
      return '在樹洞留話'
  }
}
