import { useId, useMemo, useState } from 'react'
import type { Village } from '../../lib/villages'
import { villageRows } from './tap'
import { villageCountText, villageUntouched } from './home'

/**
 * 里的列表：地圖上有的里很小（有的不到 20 px），列表是另一條路，也是鍵盤與讀屏的路。
 * 點亮多的排前面；每一列是一個至少 44 px 高的按鈕。
 */
export function VillageList({
  villages,
  lit,
  pickedId,
  onPick,
}: {
  villages: readonly Village[]
  lit: ReadonlyMap<string, number>
  pickedId: string | null
  onPick: (v: Village) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const rows = useMemo(() => villageRows(villages, lit), [villages, lit])

  return (
    <div className="village-list-wrap">
      <button type="button" className="btn block" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} data-testid="village-list-toggle">
        {open ? '收起里列表' : `用列表選里（${rows.length} 個）`}
      </button>
      {open && (
        <ul className="village-list" id={listId} data-testid="village-list" aria-label="里列表，點亮多的在前">
          {rows.map(({ village: v, lit: n }) => {
            const untouched = villageUntouched(v, n)
            const count = villageCountText(v, n)
            return (
              <li key={v.id}>
                <button
                  type="button"
                  className={`village-row ${pickedId === v.id ? 'on' : ''} ${untouched ? 'untouched' : ''}`}
                  aria-pressed={pickedId === v.id}
                  onClick={() => onPick(v)}
                  data-testid={`village-row-${v.id}`}
                >
                  <span className="village-row-name">{v.name}</span>
                  {count && <span className="village-row-count">{count}</span>}
                  {v.total > 0 && (
                    <span className={`village-row-bar ${untouched ? 'empty' : ''}`} aria-hidden="true">
                      {/* 3 成就滿格，和地圖色階一致；還沒點亮的只留一格淡虛線框 */}
                      {!untouched && <span style={{ width: `${Math.min(100, (n / v.total) * 300)}%` }} />}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
