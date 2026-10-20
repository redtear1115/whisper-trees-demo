// 打卡後的心情（團隊簡報 v20 p15，使用者決定 2026-10-20）。規格：docs/specs/04-tree-page.md「打卡後的心情」。
// 原則：玩家自己選（系統不猜）、隨時可以換、不評價情緒、臉部留白（emoji 只出現在選擇介面）、選心情沒有光點。
// 存在使用者自己的資料：ext.mood（雲端是 users/{uid}.mood 的 map 欄位），只存最新一次的選擇與上次詢問的時間。

import { getExt, setExt, useStore, type State } from '../../store'
import { whenUserReady } from '../../store/session'
import { gameConfig } from '../game/config'

export type MoodId = 'calm' | 'happy' | 'tired' | 'sad' | 'anxious' | 'angry' | 'unsure'
export type MoodInteractionId = 'water' | 'meditate' | 'hug' | 'breathe'

export interface MoodInteraction {
  id: MoodInteractionId
  label: string
  /** 這個互動目前能不能做；做得到的話 `note` 說去哪裡做，不能就說還在規劃，不假裝有 */
  available: boolean
  note: string
}

/** 簡報的建議互動。樹的頁面目前沒有任何一個（澆水在地圖上對別人的願望做，其餘還沒做），所以只用文字提到，不加新功能 */
export const INTERACTIONS: Record<MoodInteractionId, MoodInteraction> = {
  water: { id: 'water', label: '澆水', available: true, note: '到地圖點一個別人的願望，就能幫它澆水。' },
  meditate: { id: 'meditate', label: '冥想', available: false, note: '這個互動還在規劃中。現在先在樹旁安靜待一會兒，也很好。' },
  hug: { id: 'hug', label: '環抱樹', available: false, note: '這個互動還在規劃中。現在先在樹旁安靜待一會兒，也很好。' },
  breathe: { id: 'breathe', label: '呼吸', available: false, note: '這個互動還在規劃中。現在先在樹旁慢慢呼吸幾次，也很好。' },
}

export interface Mood {
  id: MoodId
  emoji: string
  name: string
  /** 玩家的光與姿態（簡報的描述，畫面上當作安靜的小字） */
  light: string
  /** 森林的回應 */
  response: string
  suggest: MoodInteractionId
}

export const MOODS: readonly Mood[] = [
  { id: 'calm', emoji: '😌', name: '平靜', light: '光穩定柔和', response: '樹葉輕晃，傳來鳥鳴', suggest: 'water' },
  { id: 'happy', emoji: '😊', name: '開心', light: '光明亮，尾巴、尾羽揚起', response: '鳥群飛來，花精冒出來一起慶祝', suggest: 'water' },
  { id: 'tired', emoji: '😮‍💨', name: '疲憊', light: '光變暗，步伐放慢', response: '樹蔭擴大，出現可以坐下的樹根', suggest: 'meditate' },
  { id: 'sad', emoji: '😢', name: '難過', light: '光微弱，身體縮起', response: '螢火蟲慢慢聚過來，靜靜停留', suggest: 'hug' },
  { id: 'anxious', emoji: '😰', name: '焦慮', light: '光點輕微閃動', response: '小鳥帶路，走一段節奏平穩的路線', suggest: 'breathe' },
  { id: 'angry', emoji: '😠', name: '生氣', light: '光偏暖紅、閃爍', response: '風吹過樹葉沙沙作響，樹精只說「我聽著」', suggest: 'breathe' },
  { id: 'unsure', emoji: '😶', name: '說不上來', light: '淡淡微光，不強求', response: '森林安靜陪伴，不追問', suggest: 'meditate' },
]

export function moodById(id: unknown): Mood | undefined {
  return MOODS.find((m) => m.id === id)
}

export interface MoodState {
  /** 最新一次選的心情；清除時是 null（雲端是逐欄合併，欄位寫 undefined 清不掉） */
  current?: { id: string; at: number } | null
  /** 上次詢問的時間（選了或略過都算） */
  askedAt?: number
}

const EMPTY: MoodState = {}
export const DEFAULT_MOOD_INTERVAL_HOURS = 8

export function moodState(s?: State): MoodState {
  return getExt<MoodState>('mood', EMPTY, s)
}

/** 目前的心情（id 認得才算；存了不認得的值當作沒選） */
export function currentMoodOf(ms: MoodState): { mood: Mood; at: number } | null {
  const c = ms.current
  const mood = c ? moodById(c.id) : undefined
  return c && mood ? { mood, at: c.at } : null
}

export function currentMood(s?: State) {
  return currentMoodOf(moodState(s))
}

/**
 * 這次打卡後要不要問心情：從沒問過就問；距離上次詢問（選了或略過）滿 intervalHours 小時才再問。
 * 間隔 0 = 每次打卡都問。上次時間在未來（時鐘被調過）當作沒問過，不會因此永遠不問。純函式。
 */
export function shouldAskMood(now: number, lastAskedAt: number | undefined, intervalHours: number = DEFAULT_MOOD_INTERVAL_HOURS): boolean {
  if (lastAskedAt === undefined || !Number.isFinite(lastAskedAt)) return true
  const elapsed = now - lastAskedAt
  if (elapsed < 0) return true
  const hours = Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : 0
  return elapsed >= hours * 3_600_000
}

/** 現在該不該問（讀 store 與 GM 設定的間隔） */
export function shouldAskMoodNow(now = Date.now(), s?: State): boolean {
  return shouldAskMood(now, moodState(s).askedAt, gameConfig(s).moodIntervalHours)
}

/** 「現在的心情」旁邊的相對時間：剛剛、N 分鐘前、N 小時前、昨天、N 天前 */
export function moodAge(at: number, now = Date.now()): string {
  const min = Math.floor((now - at) / 60_000)
  if (min < 1) return '剛剛'
  if (min < 60) return `${min} 分鐘前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return days === 1 ? '昨天' : `${days} 天前`
}

export function useMood() {
  return useStore((s) => moodState(s))
}

/**
 * 唯一的寫入口，和目前的值合併。四個動作都在使用者按下去之後才呼叫，寫入前先等使用者文件載入（雲端模式），
 * 和打卡的掉落一樣：太早寫會用空的資料蓋掉雲端的。等不到（離線逾時）仍然寫，欄位是逐欄合併，不會動到別的欄位。
 */
function patchMood(partial: Partial<MoodState>) {
  setExt('mood', { ...moodState(), ...partial })
}

/** 打卡後的詢問：選一個心情（同時記下詢問時間） */
export async function answerMood(id: MoodId, now = Date.now()) {
  await whenUserReady()
  patchMood({ current: { id, at: now }, askedAt: now })
}

/** 打卡後的詢問：略過（只記下詢問時間） */
export async function skipMood(now = Date.now()) {
  await whenUserReady()
  patchMood({ askedAt: now })
}

/** 我的：換心情（不算一次詢問，不動詢問時間） */
export async function changeMood(id: MoodId, now = Date.now()) {
  await whenUserReady()
  patchMood({ current: { id, at: now } })
}

/** 我的：清除心情 */
export async function clearMood() {
  await whenUserReady()
  patchMood({ current: null })
}
