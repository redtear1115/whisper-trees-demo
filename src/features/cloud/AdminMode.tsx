import { useState } from 'react'
import { linkGoogle, inAppBrowser, useAuth } from '../../lib/firebase'
import { useSession } from '../../store'

/**
 * 後台頁首的模式標示：
 *  - 承辦人（Google 登入且在 admins 名單）：改動寫進雲端
 *  - 其他人（含評審）：改動只寫在這台裝置的本機覆寫層，絕不寫雲端，仍可走完 Demo 路線
 */
export function AdminMode({ role }: { role: string }) {
  const session = useSession()
  const auth = useAuth()
  const [msg, setMsg] = useState<string | null>(null)
  const cloud = session.backend === 'cloud'

  if (cloud && session.admin === 'yes')
    return (
      <p className="muted small">
        {role}・<strong>承辦人：可寫入雲端</strong>
      </p>
    )

  // 在 click handler 內同步呼叫 linkGoogle（不能先 await），iOS Safari 才不會擋 popup
  const login = () => {
    linkGoogle().then((r) => {
      if (r === 'error') setMsg('沒有連上 Google，請稍後再試。')
      else if (r !== 'cancelled') setMsg(null)
    })
  }

  return (
    <p className="muted small">
      {role}・<strong>示範：只在這台裝置</strong>
      {cloud && session.admin === 'checking' && '（確認承辦人身分中…）'}
      {cloud && auth.google && session.admin === 'no' && '（這個 Google 帳號不在承辦人名單，改動不會寫入雲端）'}
      {cloud && !auth.google && !inAppBrowser() && (
        <>
          {' '}
          <button className="btn small" onClick={login}>
            承辦人登入（Google）
          </button>
        </>
      )}
      {msg && (
        <span className="error" role="alert">
          {' '}
          {msg}
        </span>
      )}
    </p>
  )
}

/** 回報備註：本機模式與承辦人看得到內容；雲端模式的其他人看不到（備註在 private/note） */
export function useCanSeeNotes(): boolean {
  const s = useSession()
  return s.backend !== 'cloud' || s.admin === 'yes'
}
