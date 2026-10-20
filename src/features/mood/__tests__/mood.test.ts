import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { DEFAULT_CONFIG, gameConfig, saveGameConfig } from '../../game/config'
import {
  answerMood,
  changeMood,
  clearMood,
  currentMood,
  currentMoodOf,
  moodAge,
  moodById,
  moodState,
  MOODS,
  noteMoodAsked,
  shouldAskMood,
  shouldAskMoodNow,
} from '../mood'

const H = 3_600_000
const T0 = new Date('2026-10-20T10:00:00+08:00').getTime()

beforeEach(() => resetAll())

describe('心情表', () => {
  it('七種心情，id 不重複，每種都有 emoji、名稱、光與姿態（只留作資料）與森林的回應', () => {
    expect(MOODS.map((m) => m.id)).toEqual(['calm', 'happy', 'tired', 'sad', 'anxious', 'angry', 'unsure'])
    expect(new Set(MOODS.map((m) => m.id)).size).toBe(7)
    for (const m of MOODS) expect(m.emoji && m.name && m.light && m.response).toBeTruthy()
  })
  it('第五輪改寫：名稱與森林此刻的回應（一句、第二人稱、不評價）', () => {
    const row = (id: string) => {
      const m = moodById(id)!
      return [m.emoji, m.name, m.response]
    }
    expect(row('calm')).toEqual(['😌', '平靜', '樹葉輕輕晃，遠處有鳥在叫。'])
    expect(row('happy')).toEqual(['😊', '開心', '一群小鳥飛過來，像在跟你一起高興。'])
    expect(row('tired')).toEqual(['😮‍💨', '疲憊', '樹蔭在你身邊大了一點，坐一下也可以。'])
    expect(row('sad')).toEqual(['😢', '難過', '螢火蟲慢慢聚過來，安靜地陪著你。'])
    expect(row('anxious')).toEqual(['😰', '焦慮', '跟著葉子的節奏，吸氣四拍，吐氣四拍。'])
    expect(row('angry')).toEqual(['😠', '生氣', '風吹過樹葉沙沙響，樹只說：「我聽著。」'])
    expect(row('unsure')).toEqual(['😶', '說不上來', '森林安靜地陪著你，不追問。'])
  })
  it('回應不評價、不叫人怎麼做太多；只有焦慮邀請一次呼吸（有呼吸圓點）', () => {
    for (const m of MOODS) expect(m.response).not.toMatch(/不好|不要|應該|怎麼了|你的光/)
    expect(MOODS.filter((m) => m.breath).map((m) => m.id)).toEqual(['anxious'])
  })
  it('不認得的 id 沒有對應', () => {
    expect(moodById('bored')).toBeUndefined()
  })
})

describe('shouldAskMood：距離上次詢問滿 8 小時才再問', () => {
  it('從沒問過就問', () => {
    expect(shouldAskMood(T0, undefined, 8)).toBe(true)
  })
  it('8 小時內不問，剛好 8 小時就問', () => {
    expect(shouldAskMood(T0, T0 - 8 * H + 1, 8)).toBe(false)
    expect(shouldAskMood(T0, T0 - 7 * H, 8)).toBe(false)
    expect(shouldAskMood(T0, T0 - 8 * H, 8)).toBe(true)
    expect(shouldAskMood(T0, T0 - 30 * H, 8)).toBe(true)
  })
  it('預設間隔是 8 小時', () => {
    expect(shouldAskMood(T0, T0 - 7 * H)).toBe(false)
    expect(shouldAskMood(T0, T0 - 9 * H)).toBe(true)
    expect(DEFAULT_CONFIG.moodIntervalHours).toBe(8)
  })
  it('間隔可調：0 = 每次都問；1 小時', () => {
    expect(shouldAskMood(T0, T0, 0)).toBe(true)
    expect(shouldAskMood(T0, T0 - 30 * 60_000, 1)).toBe(false)
    expect(shouldAskMood(T0, T0 - 61 * 60_000, 1)).toBe(true)
  })
  it('上次時間在未來（時鐘被調過）或不是數字，當作沒問過', () => {
    expect(shouldAskMood(T0, T0 + 5 * H, 8)).toBe(true)
    expect(shouldAskMood(T0, Number.NaN, 8)).toBe(true)
  })
  it('間隔不是數字或負數時當 0，不會永遠不問', () => {
    expect(shouldAskMood(T0, T0 - 1, Number.NaN)).toBe(true)
    expect(shouldAskMood(T0, T0 - 1, -3)).toBe(true)
  })
})

describe('存取', () => {
  it('沒選過：沒有心情、可以問', () => {
    expect(moodState()).toEqual({})
    expect(currentMood()).toBeNull()
    expect(shouldAskMoodNow()).toBe(true)
  })
  it('選一個：存最新的心情與詢問時間，之後 8 小時內不問', async () => {
    await answerMood('tired', T0)
    expect(moodState()).toEqual({ current: { id: 'tired', at: T0 }, askedAt: T0 })
    expect(currentMood()?.mood.name).toBe('疲憊')
    expect(shouldAskMoodNow(T0 + 7 * H)).toBe(false)
    expect(shouldAskMoodNow(T0 + 8 * H)).toBe(true)
  })
  it('那一列顯示出來但沒選：只記下詢問時間，不留心情，同樣 8 小時內不問', async () => {
    await noteMoodAsked(T0)
    expect(moodState()).toEqual({ askedAt: T0 })
    expect(currentMood()).toBeNull()
    expect(shouldAskMoodNow(T0 + H)).toBe(false)
  })
  it('只記詢問時間不會清掉之前選的心情', async () => {
    await answerMood('calm', T0)
    await noteMoodAsked(T0 + 9 * H)
    expect(currentMood()?.mood.id).toBe('calm')
    expect(moodState().askedAt).toBe(T0 + 9 * H)
  })
  it('在「我的」換心情：只存最新一個，不算一次詢問（詢問時間不動）', async () => {
    await answerMood('sad', T0)
    await changeMood('happy', T0 + H)
    expect(moodState()).toEqual({ current: { id: 'happy', at: T0 + H }, askedAt: T0 })
    expect(shouldAskMoodNow(T0 + 8 * H)).toBe(true)
  })
  it('清除：心情沒了，詢問時間還在', async () => {
    await answerMood('angry', T0)
    await clearMood()
    expect(currentMood()).toBeNull()
    expect(moodState().current).toBeNull()
    expect(moodState().askedAt).toBe(T0)
  })
  it('存了不認得的心情（別的版本寫的）當作沒選', async () => {
    expect(currentMoodOf({ current: { id: 'bored', at: T0 }, askedAt: T0 })).toBeNull()
    expect(currentMoodOf({ current: null })).toBeNull()
  })
  it('GM 調間隔後，詢問的判斷跟著變', async () => {
    await noteMoodAsked(T0)
    expect(gameConfig().moodIntervalHours).toBe(8)
    saveGameConfig({ moodIntervalHours: 1 })
    expect(shouldAskMoodNow(T0 + 2 * H)).toBe(true)
    saveGameConfig({ moodIntervalHours: 24 })
    expect(shouldAskMoodNow(T0 + 12 * H)).toBe(false)
  })
})

describe('moodAge：相對時間', () => {
  it('剛剛、分鐘、小時、昨天、天', () => {
    expect(moodAge(T0, T0 + 20_000)).toBe('剛剛')
    expect(moodAge(T0, T0 + 5 * 60_000)).toBe('5 分鐘前')
    expect(moodAge(T0, T0 + 3 * H)).toBe('3 小時前')
    expect(moodAge(T0, T0 + 30 * H)).toBe('昨天')
    expect(moodAge(T0, T0 + 3 * 24 * H)).toBe('3 天前')
  })
})
