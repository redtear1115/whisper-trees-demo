import { useId, useMemo, useState } from 'react'
import type { Village } from '../../lib/villages'
import { villageRows } from './tap'
import { splitUntouched, villageCountText, villageUntouched } from './home'

/**
 * 里的列表：地圖上有的里很小（有的不到 20 px），列表是另一條路，也是鍵盤與讀屏的路。
 * 點亮多的排前面；每一列是一個至少 44 px 高的按鈕。還沒走過的、沒有樹木資料的里各收在自己的按鈕後面（沒有資料的不算「走過」）。
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
  const { active, untouched, noData } = useMemo(() => splitUntouched(rows), [rows])
  const [showUntouched, setShowUntouched] = useState(false)
  const untouchedId = useId()
  const [showNoData, setShowNoData] = useState(false)
  const noDataId = useId()

  return (
    <div className="village-list-wrap">
      <button type="button" className="btn block" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} data-testid="village-list-toggle">
        {open ? '收起里列表' : `用列表選里（${rows.length} 個）`}
      </button>
      {open && (
        <>
          {active.length > 0 && (
            <ul className="village-list" id={listId} data-testid="village-list" aria-label="里列表，點亮多的在前">
              {active.map((r) => (
                <VillageRowItem key={r.village.id} row={r} pickedId={pickedId} onPick={onPick} />
              ))}
            </ul>
          )}
          {untouched.length > 0 && (
            <>
              <button
                type="button"
                className="btn block village-untouched-toggle"
                aria-expanded={showUntouched}
                aria-controls={untouchedId}
                onClick={() => setShowUntouched(!showUntouched)}
                data-testid="village-untouched-toggle"
              >
                {showUntouched ? '收起還沒走過的里' : `還沒走過的 ${untouched.length} 個里`}
              </button>
              {showUntouched && (
                <ul className="village-list" id={untouchedId} data-testid="village-list-untouched" aria-label="還沒走過的里">
                  {untouched.map((r) => (
                    <VillageRowItem key={r.village.id} row={r} pickedId={pickedId} onPick={onPick} />
                  ))}
                </ul>
              )}
            </>
          )}
          {noData.length > 0 && (
            <>
              <button
                type="button"
                className="btn block village-untouched-toggle"
                aria-expanded={showNoData}
                aria-controls={noDataId}
                onClick={() => setShowNoData(!showNoData)}
                data-testid="village-nodata-toggle"
              >
                {showNoData ? '收起沒有樹木資料的里' : `沒有樹木資料的 ${noData.length} 個里`}
              </button>
              {showNoData && (
                <ul className="village-list" id={noDataId} data-testid="village-list-nodata" aria-label="沒有樹木資料的里">
                  {noData.map((r) => (
                    <VillageRowItem key={r.village.id} row={r} pickedId={pickedId} onPick={onPick} />
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function VillageRowItem({ row, pickedId, onPick }: { row: { village: Village; lit: number }; pickedId: string | null; onPick: (v: Village) => void }) {
  const { village: v, lit: n } = row
  const untouched = villageUntouched(v, n)
  const count = villageCountText(v, n)
  return (
    <li>
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
}
