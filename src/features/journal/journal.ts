import type { Whisper } from '../../store/types'

export interface JournalEntry {
  treeId: string
  text: string
  at: number
}

/** 我在所有樹留下的話，新到舊。只看 state.whispers（自己的），不含示範膠囊。 */
export function journalEntries(whispers: Record<string, Whisper[]>): JournalEntry[] {
  const rows: JournalEntry[] = []
  for (const [treeId, list] of Object.entries(whispers))
    for (const w of list) if (!w.mock) rows.push({ treeId, text: w.text, at: w.at })
  return rows.sort((a, b) => b.at - a.at || a.treeId.localeCompare(b.treeId))
}
