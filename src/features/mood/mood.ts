// 打卡後的心情（團隊簡報 v20 p15，使用者決定 2026-10-20）。規格：docs/specs/04-tree-page.md「打卡後的心情」。
// 原則：玩家自己選（系統不猜）、隨時可以換、不評價情緒、臉部留白（emoji 只出現在選擇介面）、選心情沒有光點。
// 2026-10-21 第五輪：心情併進樹洞卡裡（樹洞卡上方一列可以不選的小按鈕，點了就存），不再是獨立的詢問卡。
// 2026-10-21：每一種跟樹的互動（打卡、摸摸樹、回報、樹洞）都可以加心情，每次都問、沒有間隔；
// 每一次的心情存在日記（features/journal/diary.ts）。這裡的 ext.mood（雲端 users/{uid}.mood）只留「現在的心情」：最新一次的選擇。

import { getExt, setExt, useStore, type State } from '../../store'
import { whenUserReady } from '../../store/session'

export type MoodId = 'calm' | 'happy' | 'tired' | 'sad' | 'anxious' | 'angry' | 'unsure'

export interface Mood {
  id: MoodId
  emoji: string
  name: string
  /**
   * 簡報的「玩家的光與姿態」描述。畫面上不顯示，只留作之後做動畫的依據（2026-10-21 第五輪：
   * 「你的光：…」像在替玩家下結論，已從介面拿掉）。
   */
  light: string
  /** 森林此刻的回應：發生在現在、第二人稱、不評價（2026-10-21 重寫，一句話） */
  response: string
  /** 回應是邀請一次呼吸：旁邊放一個小小的呼吸圓點（純 CSS，尊重減少動態） */
  breath?: boolean
}

export const MOODS: readonly Mood[] = [
  { id: 'calm', emoji: '😌', name: '平靜', light: '光穩定柔和', response: '樹葉輕輕晃，遠處有鳥在叫。' },
  { id: 'happy', emoji: '😊', name: '開心', light: '光明亮，尾巴、尾羽揚起', response: '一群小鳥飛過來，像在跟你一起高興。' },
  { id: 'tired', emoji: '😮‍💨', name: '疲憊', light: '光變暗，步伐放慢', response: '樹蔭在你身邊大了一點，坐一下也可以。' },
  { id: 'sad', emoji: '😢', name: '難過', light: '光微弱，身體縮起', response: '螢火蟲慢慢聚過來，安靜地陪著你。' },
  { id: 'anxious', emoji: '😰', name: '焦慮', light: '光點輕微閃動', response: '跟著葉子的節奏，吸氣四拍，吐氣四拍。', breath: true },
  { id: 'angry', emoji: '😠', name: '生氣', light: '光偏暖紅、閃爍', response: '風吹過樹葉沙沙響，樹只說：「我聽著。」' },
  { id: 'unsure', emoji: '😶', name: '說不上來', light: '淡淡微光，不強求', response: '森林安靜地陪著你，不追問。' },
]

export function moodById(id: unknown): Mood | undefined {
  return MOODS.find((m) => m.id === id)
}

export interface MoodState {
  /** 最新一次選的心情；清除時是 null（雲端是逐欄合併，欄位寫 undefined 清不掉） */
  current?: { id: string; at: number } | null
  /** 舊資料：上次詢問的時間（2026-10-21 起不再有詢問間隔，不再寫） */
  askedAt?: number
}

const EMPTY: MoodState = {}

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
 * 唯一的寫入口，和目前的值合併。都在使用者按下去之後才呼叫，寫入前先等使用者文件載入（雲端模式），
 * 和打卡的掉落一樣：太早寫會用空的資料蓋掉雲端的。等不到（離線逾時）仍然寫，欄位是逐欄合併，不會動到別的欄位。
 */
function patchMood(partial: Partial<MoodState>) {
  setExt('mood', { ...moodState(), ...partial })
}

/** 換「現在的心情」：我的頁面，以及每次在互動後選心情（diary.pickMood） */
export async function changeMood(id: MoodId, now = Date.now()) {
  await whenUserReady()
  patchMood({ current: { id, at: now } })
}

/** 我的：清除心情 */
export async function clearMood() {
  await whenUserReady()
  patchMood({ current: null })
}
