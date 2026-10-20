import { MoodAsk, MoodCollapsed } from '../mood/MoodCards'
import { moodOf, pickMood, useDiary, type InteractionKind } from './diary'

/**
 * 某一次跟樹的互動（打卡、摸摸樹、回報、樹洞）的心情：可以不選，點了就存到那一次互動上，也成為「現在的心情」。
 * open：剛做完的那一刻展開七個按鈕；否則縮成一行「心情：沒選・選一個」。
 */
export function InteractionMood({ kind, treeId, at, open = false }: { kind: InteractionKind; treeId: string; at: number; open?: boolean }) {
  const entries = useDiary().entries
  const selected = moodOf(entries, kind, treeId, at)
  const onPick = (id: Parameters<typeof pickMood>[3]) => void pickMood(kind, treeId, at, id)
  const onClear = () => void pickMood(kind, treeId, at, null)
  return (
    <div className="interaction-mood" data-testid={`mood-${kind}`}>
      {open ? <MoodAsk selected={selected} onPick={onPick} onClear={onClear} /> : <MoodCollapsed selected={selected} onPick={onPick} onClear={onClear} />}
    </div>
  )
}
