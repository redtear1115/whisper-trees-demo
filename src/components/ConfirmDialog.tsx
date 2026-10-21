import { useEffect, useId, type ReactNode } from 'react'

interface Props {
  title: string
  /** 會發生什麼、會失去什麼；一句一行 */
  lines: ReactNode[]
  confirmLabel: string
  /** 刪除、清除這類不能復原的：確認鈕用紅色 */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * App 內的確認框（代替瀏覽器原生的 confirm()）：寫出會發生什麼、會失去什麼，
 * 預設焦點在「取消」，Esc 或點外面也是取消。樣式沿用慶祝視窗的 .modal。
 */
export function ConfirmDialog({ title, lines, confirmLabel, danger = false, onConfirm, onCancel }: Props) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} data-testid="confirm-dialog">
        <h2 id={titleId} className="confirm-title">
          {title}
        </h2>
        <ul className="confirm-lines">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onCancel} autoFocus data-testid="confirm-cancel">
            取消
          </button>
          <button type="button" className={`btn ${danger ? 'danger-solid' : 'primary'}`} onClick={onConfirm} data-testid="confirm-ok">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
