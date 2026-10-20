import { useEffect, useRef, useState } from 'react'
import { declineMigration } from '../../store/migrate'
import { migrateToCloud, useSession } from '../../store'
import { CONNECTION_TEXT } from '../../store/unavailable'

/**
 * 雲端連不上時頂端的連線狀態（2026-10-21 起取代「離線示範模式」：不退回本機，一直重連，連回來自己消失）。
 * 文字見 CONNECTION_TEXT；data-state 是狀態（reconnecting／offline／quota）。
 */
export function ConnectionBanner() {
  const { connection } = useSession()
  const ref = useRef<HTMLParagraphElement>(null)
  const show = connection !== 'ok'
  useEffect(() => {
    document.body.classList.toggle('has-offline', show)
    return () => document.body.classList.remove('has-offline')
  }, [show])
  // 窄螢幕或字放大時會折成兩行：把實際高度給 CSS（--offline-h），頁面往下讓的距離跟著變，不會蓋住內容
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => document.body.style.setProperty('--offline-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.body.style.removeProperty('--offline-h')
    }
  }, [show])
  if (connection === 'ok') return null
  return (
    <p ref={ref} className="offline-banner" role="status" data-testid="connection-banner" data-state={connection}>
      {CONNECTION_TEXT[connection]}
    </p>
  )
}

/** 雲端寫入被拒、已撤回畫面上的變更時，短暫提示 */
export function WriteFailedToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      clearTimeout(t)
      t = setTimeout(() => setMsg(null), 5000)
    }
    window.addEventListener('wt:write-failed', on)
    return () => {
      window.removeEventListener('wt:write-failed', on)
      clearTimeout(t)
    }
  }, [])
  if (!msg) return null
  return (
    <p className="write-failed" role="alert">
      {msg}
    </p>
  )
}

/**
 * 第一次進雲端模式、這台裝置有舊的本機紀錄：問要不要搬。
 * 不是對話框（2026-10-20 決定）：浮在導覽上方的小卡，不擋住畫面、不搶焦點、不鎖背景，
 * 回來的本機使用者照常看集章冊，想處理再按。內容與動作和原本的對話框一樣：存到雲端、先不要（= 這台不再問）。
 */
export function MigrationPrompt() {
  const { migration } = useSession()
  const [whispers, setWhispers] = useState(false)
  if (!migration) return null
  const { summary: s, running, error } = migration
  const parts = [
    s.wishes && `${s.wishes} 個許願`,
    s.reports && `${s.reports} 筆回報`,
    s.checkins && `${s.checkins} 次打卡`,
    s.progress && '光點與造型',
  ].filter(Boolean)
  return (
    <section className="migrate-banner" aria-labelledby="mig-title" data-testid="migrate-banner">
      <h2 id="mig-title">把這台裝置上的紀錄存到雲端？</h2>
      <p>
        {parts.length ? `這台裝置上有：${parts.join('、')}。` : '這台裝置上有舊的紀錄。'}
        存到雲端後，換裝置或用 Google 保留也找得回來。
      </p>
      {s.whispers > 0 && (
        <label className="check">
          <input type="checkbox" checked={whispers} onChange={(e) => setWhispers(e.target.checked)} />
          也把我的 {s.whispers} 則樹洞存上去（其他人看不到）
        </label>
      )}
      <p className="muted small">示範資料與後台的設定不會搬。不搬的紀錄會在備份裡留到 2026-10-31。</p>
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      <div className="row gap">
        <button className="btn primary" disabled={running} onClick={() => migrateToCloud(whispers)} data-testid="migrate-yes">
          {running ? '存放中…' : '存到雲端'}
        </button>
        <button className="btn" disabled={running} onClick={declineMigration} data-testid="migrate-no">
          先不要
        </button>
      </div>
    </section>
  )
}
