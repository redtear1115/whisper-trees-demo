import { useEffect, type ReactNode } from 'react'
import { Art } from '../../components/ui'
import { useStore } from '../../store'
import { badges } from '../game/badges'

/** 拿到徽章的慶祝內容：徽章圖、名稱、一句話。輕輕發光，不閃、不響。 */
export function Celebration({ badgeId, children }: { badgeId: string; children?: ReactNode }) {
  const state = useStore((s) => s) // badges() 每次回新陣列，不能直接當 selector（會無限重繪）
  const badge = badges(state).find((b) => b.id === badgeId)
  if (!badge) return null
  return (
    <div className="celebrate" data-testid={`celebrate-${badgeId}`}>
      <p className="celebrate-kicker">獲得徽章</p>
      <Art id={badge.art} alt={badge.name} className="celebrate-art" />
      <h3 className="celebrate-name">{badge.name}</h3>
      <p className="muted small celebrate-hint">{badge.hint}</p>
      {children}
    </div>
  )
}

/** 獨立跳出的慶祝（不在引導裡面時用）：可以按「好」或 Esc 收起 */
export function CelebrationDialog({ badgeId, onClose, children }: { badgeId: string; onClose: () => void; children?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const state = useStore((s) => s)
  const name = badges(state).find((b) => b.id === badgeId)?.name ?? ''
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`獲得徽章：${name}`}>
        <Celebration badgeId={badgeId}>{children}</Celebration>
        <button className="btn primary block" onClick={onClose} autoFocus>
          好
        </button>
      </div>
    </div>
  )
}
