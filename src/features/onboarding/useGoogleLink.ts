import { useState } from 'react'
import { linkGoogle } from '../../lib/firebase'

/** 「用 Google 保留紀錄」：選單的帳號卡與新手引導共用。linkGoogle 要在 click 事件裡同步呼叫（popup 不被擋）。 */
export function useGoogleLink() {
  const [msg, setMsg] = useState<string | null>(null)
  const link = () => {
    setMsg(null)
    linkGoogle().then((r) => {
      if (r === 'linked') setMsg('已用 Google 保留。換瀏覽器或換手機，用同一個 Google 登入就找得回來。')
      else if (r === 'switched')
        setMsg('這個 Google 帳號已經有紀錄，已切換過去。這台裝置原本的訪客紀錄不會合併，會留在這台裝置的訪客帳號裡。')
      else if (r === 'error') setMsg('沒有連上 Google，請稍後再試。')
    })
  }
  return { msg, link }
}
