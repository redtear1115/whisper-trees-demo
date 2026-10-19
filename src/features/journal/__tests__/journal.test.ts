import { describe, expect, it } from 'vitest'
import { journalEntries } from '../journal'

describe('journalEntries', () => {
  it('flattens whispers across trees, newest first', () => {
    const rows = journalEntries({
      A: [{ text: 'a1', at: 100 }, { text: 'a2', at: 300 }],
      'B-001': [{ text: 'b1', at: 200 }],
    })
    expect(rows.map((r) => [r.treeId, r.text])).toEqual([['A', 'a2'], ['B-001', 'b1'], ['A', 'a1']])
  })

  it('skips mock seeds and handles empty', () => {
    expect(journalEntries({})).toEqual([])
    expect(journalEntries({ A: [{ text: 'seed', at: 1, mock: true }, { text: 'mine', at: 2 }] })).toEqual([
      { treeId: 'A', text: 'mine', at: 2 },
    ])
  })
})
