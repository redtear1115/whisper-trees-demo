import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { DEFAULT_CONFIG } from '../../game/config'
import {
  changeMood,
  clearMood,
  currentMood,
  currentMoodOf,
  moodAge,
  moodById,
  moodState,
  MOODS,
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
  it('名稱與森林此刻的回應（一句、第二人稱、不評價）', () => {
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

describe('存取（沒有詢問間隔，ext.mood 只留現在的心情）', () => {
  it('沒選過：沒有心情', () => {
    expect(moodState()).toEqual({})
    expect(currentMood()).toBeNull()
  })
  it('GM 設定不再有詢問間隔', () => {
    expect('moodIntervalHours' in DEFAULT_CONFIG).toBe(false)
  })
  it('換心情：只存最新一個', async () => {
    await changeMood('sad', T0)
    await changeMood('happy', T0 + H)
    expect(moodState()).toEqual({ current: { id: 'happy', at: T0 + H } })
    expect(currentMood()?.mood.name).toBe('開心')
  })
  it('清除：心情沒了', async () => {
    await changeMood('angry', T0)
    await clearMood()
    expect(currentMood()).toBeNull()
    expect(moodState().current).toBeNull()
  })
  it('存了不認得的心情（別的版本寫的）當作沒選', () => {
    expect(currentMoodOf({ current: { id: 'bored', at: T0 }, askedAt: T0 })).toBeNull()
    expect(currentMoodOf({ current: null })).toBeNull()
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
