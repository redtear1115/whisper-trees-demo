import { useRef, type KeyboardEvent } from 'react'
import { tabKeyTarget } from './tabsKeys'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  testId?: string
}

interface Props<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** 給讀屏的名稱，例如「檢視方式」 */
  label: string
  testId?: string
  /** 撐滿整行、各選項等寬（樹洞）；預設依內容寬（集章冊） */
  fill?: boolean
  /**
   * 'buttons'（預設）：一組切換鈕，`aria-pressed`，Tab 逐個走。
   * 'tabs'：真正的分頁——tablist／tab、`aria-controls`、roving tabindex、左右鍵與 Home／End；
   * 要配 `segmentedPanelProps` 做對應的 tabpanel。
   */
  mode?: 'buttons' | 'tabs'
  /** tabs 模式必填：產生 tab 與 panel 的 id 前綴 */
  idBase?: string
}

export const segmentedTabId = (idBase: string, value: string) => `${idBase}-tab-${value}`
export const segmentedPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`

/** 對應 tabs 模式的 tabpanel 要展開的屬性 */
export function segmentedPanelProps(idBase: string, value: string) {
  return {
    role: 'tabpanel' as const,
    id: segmentedPanelId(idBase, value),
    'aria-labelledby': segmentedTabId(idBase, value),
    tabIndex: 0,
  }
}

/**
 * 全站同一種分段切換：按鈕 ≥ 44 px 高，選中的是綠底白字。
 * 樣式是 `.segmented`（index.css），集章冊與政府端直接用同一個 class。
 */
export function Segmented<T extends string>({ options, value, onChange, label, testId, fill, mode = 'buttons', idBase }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const tabs = mode === 'tabs'
  const current = options.findIndex((o) => o.value === value)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!tabs) return
    const target = tabKeyTarget(e.key, current, options.length)
    if (target === null) return
    e.preventDefault()
    onChange(options[target].value)
    refs.current[target]?.focus()
  }

  return (
    <div
      className={`segmented${fill ? ' fill' : ''}`}
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
      data-testid={testId}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            className={on ? 'on' : ''}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            {...(tabs
              ? {
                  role: 'tab',
                  id: segmentedTabId(idBase ?? 'seg', o.value),
                  'aria-selected': on,
                  // 只有選中的那個分頁的 panel 在 DOM 裡（另一個沒掛載），所以只有它指向 panel
                  'aria-controls': on ? segmentedPanelId(idBase ?? 'seg', o.value) : undefined,
                  tabIndex: on ? 0 : -1,
                }
              : { 'aria-pressed': on })}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
