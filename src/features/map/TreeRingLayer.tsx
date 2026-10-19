import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Map as MLMap } from 'maplibre-gl'
import type { Tree } from '../../lib/trees'
import { Art } from '../../components/ui'
import { arcOffsets, farNote, ringActions, type RangeInfo, type RingAction } from './treeRings'

/** 弧的半徑（px）：Demo 的 5 個 56 px 圈（弧張到 170°）在 360 px 寬的螢幕上排得下，彼此不重疊 */
const ARC_RADIUS = 118

interface Props {
  map: MLMap | null
  tree: Tree
  /** 鏡頭還在飛的時候先不顯示 */
  shown: boolean
  range: RangeInfo
  onClose: () => void
  onGo: (a: RingAction) => void
  /** Demo 模式：多一個「走過去」 */
  demo?: boolean
}

/**
 * 點樹後，樹旁浮出的四個發光行動圈（一道弧，在樹下方）。
 * 是蓋在地圖上的一層（不是地圖標記），位置跟著樹在畫面上的位置走；圈外只有「樹的資料」能用，其餘變灰，
 * 點灰色的會出現平靜的提醒。焦點移到第一個圈、Esc 關閉。
 */
export function TreeRingLayer({ map, tree, shown, range, onClose, onGo, demo = false }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  const actions = ringActions(tree.id, range, demo)
  const offsets = arcOffsets(actions.length, ARC_RADIUS)

  // 跟著樹在畫面上的位置
  useEffect(() => {
    if (!map) return
    const place = () => {
      const p = map.project(tree.lngLat)
      if (host.current) host.current.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`
    }
    place()
    map.on('move', place)
    map.on('resize', place)
    return () => {
      map.off('move', place)
      map.off('resize', place)
    }
  }, [map, tree])

  // 換一棵樹、或走進（走出）感應圈，就清掉上一個提醒
  useEffect(() => setNote(''), [tree.id, range.inRange])

  // 到位後：焦點移到第一個圈
  useEffect(() => {
    if (shown) host.current?.querySelector<HTMLElement>('.tree-ring')?.focus()
  }, [shown, tree.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="tree-rings-layer" data-testid="tree-rings-layer">
      <div ref={host} className={`tree-rings ${shown ? 'shown' : ''}`} data-testid="tree-rings" data-tree-id={tree.id} role="group" aria-label={`${tree.species}：可以做的事`} aria-hidden={!shown}>
        <div className="tree-rings-title">
          <span className="tree-rings-name">
            {tree.species}
            {tree.place && `・${tree.place}`}
          </span>
          <button className="tree-rings-close" data-testid="tree-rings-close" aria-label="關閉，回到街景" onClick={onClose} tabIndex={shown ? 0 : -1}>
            ×
          </button>
        </div>
        {actions.map((a, i) => (
          <button
            key={a.id}
            className={`tree-ring ${a.enabled ? '' : 'off'}`}
            data-testid={`ring-${a.id}`}
            data-enabled={a.enabled}
            aria-label={a.aria}
            aria-disabled={!a.enabled}
            tabIndex={shown ? 0 : -1}
            style={{ '--x': `${offsets[i].x}px`, '--y': `${offsets[i].y}px`, transitionDelay: `${i * 50}ms` } as CSSProperties}
            onClick={() => {
              if (!a.enabled) return setNote(farNote(range))
              onGo(a)
            }}
          >
            <span className="tree-ring-disc">
              <Art id={a.art} alt="" className="tree-ring-icon" />
            </span>
            <span className="tree-ring-label">{a.label}</span>
          </button>
        ))}
        <p className="tree-rings-note" data-testid="ring-note" role="status" style={{ top: ARC_RADIUS + 70 }}>
          {note}
        </p>
      </div>
    </div>
  )
}
