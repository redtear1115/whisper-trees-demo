import { beforeEach, describe, expect, it } from 'vitest'
import { resetAll } from '../../../store'
import { setSession } from '../../../store/session'
import { currentMood } from '../../mood/mood'
import type { TreeReport } from '../../../store/types'
import { DIARY_MAX, diary, diaryRows, MATCH_MS, moodOf, pickMood, recordTouch, rowTitle, withMood, withTouch, type DiaryEntry } from '../diary'

beforeEach(() => {
  resetAll()
  setSession({ userReady: true })
})

const report = (p: Partial<TreeReport>): TreeReport => ({
  id: 'r', treeId: 'A', species: '樟樹', road: '', district: '大安區', kind: 'other', details: [], note: '', hasPhoto: false, at: 0, ...p,
})

describe('withMood / moodOf', () => {
  it('adds, changes and clears the mood of one interaction', () => {
    let e: DiaryEntry[] = withMood([], 'checkin', 'A', 1000, 'calm')
    expect(moodOf(e, 'checkin', 'A', 1000)).toBe('calm')
    e = withMood(e, 'checkin', 'A', 1000, 'happy')
    expect(e).toHaveLength(1)
    expect(moodOf(e, 'checkin', 'A', 1000)).toBe('happy')
    e = withMood(e, 'checkin', 'A', 1000, null)
    expect(e).toEqual([])
  })
  it('matches within MATCH_MS (server time drift) but not other kinds or trees', () => {
    const e = withMood([], 'whisper', 'A', 1000, 'sad')
    expect(moodOf(e, 'whisper', 'A', 1000 + MATCH_MS)).toBe('sad')
    expect(moodOf(e, 'whisper', 'A', 1000 + MATCH_MS + 1)).toBeNull()
    expect(moodOf(e, 'report', 'A', 1000)).toBeNull()
    expect(moodOf(e, 'whisper', 'B', 1000)).toBeNull()
  })
  it('a touch keeps its entry when the mood is cleared', () => {
    let e = withTouch([], 'A', 'hug', 5000)
    e = withMood(e, 'touch', 'A', 5000, 'tired')
    expect(e).toEqual([{ kind: 'touch', treeId: 'A', at: 5000, touch: 'hug', mood: 'tired' }])
    e = withMood(e, 'touch', 'A', 5000, null)
    expect(e).toEqual([{ kind: 'touch', treeId: 'A', at: 5000, touch: 'hug' }])
  })
  it('ignores unknown mood ids and keeps only the newest DIARY_MAX', () => {
    expect(moodOf([{ kind: 'checkin', treeId: 'A', at: 1, mood: 'bored' as never }], 'checkin', 'A', 1)).toBeNull()
    let e: DiaryEntry[] = []
    for (let i = 0; i < DIARY_MAX + 5; i++) e = withTouch(e, 'A', 'breathe', i * 1_000_000)
    expect(e).toHaveLength(DIARY_MAX)
    expect(e[0].at).toBe(5 * 1_000_000)
  })
})

describe('pickMood / recordTouch (store)', () => {
  it('stores the mood on the interaction and as the current mood', async () => {
    await pickMood('checkin', 'A', 1000, 'anxious')
    expect(diary().entries).toEqual([{ kind: 'checkin', treeId: 'A', at: 1000, mood: 'anxious' }])
    expect(currentMood()?.mood.id).toBe('anxious')
    await recordTouch('A', 'meditate', 2000)
    expect(diary().entries).toHaveLength(2)
  })
})

describe('diaryRows', () => {
  it('merges check-ins, whispers, own reports and touches, newest first, each with its mood', () => {
    const entries: DiaryEntry[] = [
      { kind: 'checkin', treeId: 'A', at: 100, mood: 'calm' },
      { kind: 'whisper', treeId: 'A', at: 205, mood: 'happy' },
      { kind: 'touch', treeId: 'A', at: 300, touch: 'breathe' },
    ]
    const rows = diaryRows({
      checkins: [{ treeId: 'A', result: 'success', at: 100 }, { treeId: 'B', result: 'farView', at: 50 }],
      whispers: { A: [{ text: 'hi', at: 200 }, { text: 'seed', at: 10, mock: true }] },
      reports: [report({ treeId: 'A', at: 400 }), report({ treeId: 'A', at: 500, mock: true }), report({ treeId: 'A', at: 600, mine: false })],
      entries,
    })
    expect(rows.map((r) => [r.kind, r.at, r.mood])).toEqual([
      ['report', 400, null],
      ['touch', 300, null],
      ['whisper', 200, 'happy'],
      ['checkin', 100, 'calm'],
      ['checkin', 50, null],
    ])
    expect(rows.map(rowTitle)).toEqual(['回報了樹況', '摸摸樹・呼吸', '在樹洞留話', '掃樹牌打卡', '遠遠陪著它'])
    expect(rows.find((r) => r.kind === 'whisper')?.text).toBe('hi')
  })
  it('is empty with no records', () => {
    expect(diaryRows({ checkins: [], whispers: {}, reports: [], entries: [] })).toEqual([])
  })
})
