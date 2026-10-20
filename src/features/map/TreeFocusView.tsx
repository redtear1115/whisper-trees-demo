import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Tree } from '../../lib/trees'
import { Art } from '../../components/ui'
import { IconActionAdopt, IconActionInfo, IconActionReport, IconActionRoute, IconActionTouch, IconActionWalk, IconActionWhisper, IconBack } from '../../components/icons'
import { BalanceChip } from '../nav/BalanceChip'
import type { Animal } from '../avatar/animals'
import { TouchPanel } from '../touch/TouchPanel'
import { focusActions, focusButtons, type FocusActionId, type RangeInfo } from './treeRings'
import { InfoCard, ReportCard, WhisperCard } from './FocusCards'

const ICON: Record<FocusActionId, ReactNode> = {
  touch: <IconActionTouch />,
  report: <IconActionReport />,
  whisper: <IconActionWhisper />,
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
  onScan: () => void
  onRoute: () => void
  onWalk: () => void
}

/**
 * 點樹之後的拉近畫面（2026-10-21，依使用者給的「拉近的介面」設計圖）：蓋住地圖與底部導覽，
 * 中間一棵大樹，樹冠上是三個互動的大圈（摸摸樹、回報、留言在樹洞）和兩個小圈（樹的資料、認養），
 * 你的動物站在樹下；底部是「返回」與「樹的資料」，範圍外再加「怎麼走」「走過去」。
 * 底部導覽留著；打過卡的互動點了在畫面裡打開一張卡；還沒打卡，在感應圈內直接去掃樹牌，圈外先走過去（第三版）。
 * 是對話框（role=dialog）：焦點移到第一個圈、Esc 關閉。
 */
export function TreeFocusView({ tree, range, checkedIn, animal, demo, onClose, onScan, onRoute, onWalk }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  /** 打開的卡（摸摸樹、回報、留言在樹洞、樹的資料）；null = 看得到圈 */
  const [card, setCard] = useState<Exclude<FocusActionId, 'adopt'> | 'info' | null>(null)
  const actions = focusActions(range, checkedIn)
  const buttons = focusButtons(range, checkedIn, demo)

  // 換一棵樹、走進感應圈、打了卡，就清掉上一個提醒
  useEffect(() => setNote(''), [tree.id, range.inRange, checkedIn])
  useEffect(() => setCard(null), [tree.id])

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('.focus-ring')?.focus()
  }, [tree.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (card) setCard(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, card])

  // 掛在手機框（.phone-shell）上：地圖頁自己的層疊順序蓋不過底部導覽；桌機 Demo 時也維持手機寬度
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
        {/* 你的動物站在樹下 */}
        <Art id={animal.art} alt={`你在這裡：${animal.name}`} className="tree-focus-animal" />
        {!card &&
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
                if (!a.enabled || a.id === 'adopt') return setNote(a.why)
                // 還沒打卡：在感應圈內直接去掃樹牌（掃一次 30 分鐘內都不用再掃）；圈外先走過去（Demo 模擬走到樹旁，一般畫路線）
                if (a.first === 'scan') return onScan()
                if (a.first === 'walk') return demo ? onWalk() : onRoute()
                setCard(a.id)
              }}
            >
              <span className="focus-ring-icon" aria-hidden>
                {ICON[a.id]}
              </span>
              <span className="focus-ring-label">{a.label}</span>
            </button>
          ))}
      </div>

      {card && (
        <div className="tree-focus-sheet" data-testid={`focus-sheet-${card}`}>
          {card !== 'touch' && (
            <button type="button" className="btn ghost small focus-card-close" data-testid="focus-card-close" onClick={() => setCard(null)}>
              收起
            </button>
          )}
          {card === 'touch' && <TouchPanel treeId={tree.id} onClose={() => setCard(null)} />}
          {card === 'whisper' && <WhisperCard treeId={tree.id} />}
          {card === 'report' && <ReportCard tree={tree} onClose={() => setCard(null)} />}
          {card === 'info' && <InfoCard tree={tree} />}
        </div>
      )}

      <p className="tree-focus-note" role="status" data-testid="focus-note">
        {note}
      </p>


      <div className="tree-focus-bar">
        <button type="button" className="btn focus-back" data-testid="focus-back" onClick={onClose}>
          <IconBack /> 返回
        </button>
        <button type="button" className="btn" data-testid="focus-info" aria-pressed={card === 'info'} onClick={() => setCard(card === 'info' ? null : 'info')}>
          <IconActionInfo /> 樹的資料
        </button>
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
    document.querySelector('.phone-shell') ?? document.body,
  )
}
