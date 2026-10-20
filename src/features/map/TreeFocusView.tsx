import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Tree } from '../../lib/trees'
import { Art } from '../../components/ui'
import { IconActionAdopt, IconActionInfo, IconActionReport, IconActionRoute, IconActionTouch, IconActionWalk, IconActionWhisper, IconBack, IconScan } from '../../components/icons'
import { BalanceChip } from '../nav/BalanceChip'
import type { Animal } from '../avatar/animals'
import { TouchPanel } from '../touch/TouchPanel'
import { focusActions, focusButtons, type FocusAction, type FocusActionId, type RangeInfo } from './treeRings'

const ICON: Record<FocusActionId, ReactNode> = {
  touch: <IconActionTouch />,
  report: <IconActionReport />,
  whisper: <IconActionWhisper />,
  info: <IconActionInfo />,
  adopt: <IconActionAdopt />,
}

interface Props {
  tree: Tree
  range: RangeInfo
  /** 30 分鐘內在這棵樹打過卡：三個互動才打得開 */
  checkedIn: boolean
  animal: Animal
  demo: boolean
  onClose: () => void
  /** 回報、留言在樹洞、樹的資料：去樹的頁面 */
  onGo: (a: FocusAction) => void
  onScan: () => void
  onRoute: () => void
  onWalk: () => void
}

/**
 * 點樹之後的拉近畫面（2026-10-21，依使用者給的「拉近的介面」設計圖）：蓋住地圖與底部導覽，
 * 中間一棵大樹，樹冠上是三個互動的大圈（摸摸樹、回報、留言在樹洞）和兩個小圈（樹的資料、認養），
 * 你的動物站在右下角，左下是「返回」；旁邊依情況是「掃樹牌」或「怎麼走」「走過去」。
 * 是對話框（role=dialog）：焦點移到第一個圈、Esc 關閉。
 */
export function TreeFocusView({ tree, range, checkedIn, animal, demo, onClose, onGo, onScan, onRoute, onWalk }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  const [touching, setTouching] = useState(false)
  const actions = focusActions(tree.id, range, checkedIn)
  const buttons = focusButtons(range, checkedIn, demo)

  // 換一棵樹、走進感應圈、打了卡，就清掉上一個提醒
  useEffect(() => setNote(''), [tree.id, range.inRange, checkedIn])
  useEffect(() => setTouching(false), [tree.id])

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('.focus-ring')?.focus()
  }, [tree.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (touching) setTouching(false)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, touching])

  // 掛在 body 上：地圖頁自己的層疊順序蓋不過底部導覽
  return createPortal(
    <div ref={root} className="tree-focus" role="dialog" aria-modal="true" aria-labelledby="tree-focus-name" data-testid="tree-focus" data-tree-id={tree.id}>
      <div className="tree-focus-top">
        <p id="tree-focus-name" className="tree-focus-name">
          {tree.species}
          {tree.place && <span className="muted">・{tree.place}</span>}
        </p>
        <BalanceChip />
      </div>

      <div className="tree-focus-stage">
        <Art id="tree-focus" alt="" className="tree-focus-art" />
        {!touching &&
          actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`focus-ring ${a.size} ring-${a.id} ${a.enabled ? '' : 'off'}`}
              data-testid={`focus-${a.id}`}
              data-enabled={a.enabled}
              aria-label={a.aria}
              aria-disabled={!a.enabled}
              onClick={() => {
                if (!a.enabled) return setNote(a.why)
                if (a.id === 'touch') return setTouching(true)
                onGo(a)
              }}
            >
              <span className="focus-ring-icon" aria-hidden>
                {ICON[a.id]}
              </span>
              <span className="focus-ring-label">{a.label}</span>
            </button>
          ))}
      </div>

      {touching && (
        <div className="tree-focus-sheet">
          <TouchPanel treeId={tree.id} onClose={() => setTouching(false)} />
        </div>
      )}

      <p className="tree-focus-note" role="status" data-testid="focus-note">
        {note}
      </p>

      <Art id={animal.art} alt={`你在這裡：${animal.name}`} className="tree-focus-animal" />

      <div className="tree-focus-bar">
        <button type="button" className="btn focus-back" data-testid="focus-back" onClick={onClose}>
          <IconBack /> 返回
        </button>
        {buttons.scan && (
          <button type="button" className="btn primary" data-testid="focus-scan" onClick={onScan}>
            <IconScan /> 掃樹牌
          </button>
        )}
        {buttons.route && (
          <button type="button" className="btn" data-testid="focus-route" onClick={onRoute}>
            <IconActionRoute /> 怎麼走
          </button>
        )}
        {buttons.walk && (
          <button type="button" className="btn" data-testid="focus-walk" onClick={onWalk}>
            <IconActionWalk /> 走過去
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
