import { useEffect, useState } from 'react'
import { declineMigration } from '../../store/migrate'
import { migrateToCloud, useSession } from '../../store'

/** 雲端失敗而退回本機模式時，頂端的提示 */
export function FallbackBanner() {
  const { fallback } = useSession()
  useEffect(() => {
    document.body.classList.toggle('has-offline', fallback)
    return () => document.body.classList.remove('has-offline')
  }, [fallback])
  if (!fallback) return null
  return (
    <p className="offline-banner" role="status">
      目前是離線示範模式，資料只存在這台裝置
    </p>
  )
}

/** 第一次進雲端模式、這台裝置有舊的本機紀錄：問要不要搬 */
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
    <div className="modal-back">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mig-title">
        <h2 id="mig-title">把這台裝置上的紀錄存到雲端？</h2>
        <p>
          {parts.length ? `這台裝置上有：${parts.join('、')}。` : '這台裝置上有舊的紀錄。'}
          存到雲端後，換裝置或用 Google 保留也找得回來。
        </p>
        {s.whispers > 0 && (
          <label className="check">
            <input type="checkbox" checked={whispers} onChange={(e) => setWhispers(e.target.checked)} />
            也把我的 {s.whispers} 則樹洞存上去（只有我看得到）
          </label>
        )}
        <p className="muted small">示範資料與後台的設定不會搬。不搬的紀錄會在備份裡留到 2026-10-31。</p>
        {error && (
          <p className="error small" role="alert">
            {error}
          </p>
        )}
        <div className="row gap">
          <button className="btn primary" disabled={running} onClick={() => migrateToCloud(whispers)}>
            {running ? '存放中…' : '存到雲端'}
          </button>
          <button className="btn" disabled={running} onClick={declineMigration}>
            先不要
          </button>
        </div>
      </div>
    </div>
  )
}
