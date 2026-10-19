// Android Chrome 的「安裝」提示：beforeinstallprompt 在頁面載入後很早就會觸發，
// 所以在 main.tsx 一開始就 import 這個檔案先接住，等使用者走到「加到主畫面」那一步才用。

import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

/** 瀏覽器有給安裝提示（只有 Android Chrome 等會有） */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => deferred !== null,
  )
}

/** 跳出瀏覽器的安裝視窗；一個事件只能用一次 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  deferred = null
  emit()
  await e.prompt()
  return (await e.userChoice).outcome
}
