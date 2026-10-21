// 連不上雲端時怎麼辦（**不退回離線模式**，改成顯示連線狀態、一直自動重連）。
// 起因：使用者回報待機一陣子就變成「離線示範模式」、重新整理又好。螢幕關掉、切到別的 App 時頁面被暫停，
// 30 秒的計時器也被凍住，回到前景那一刻就到期，以前就直接退回本機、而且不會自己回來。
// 現在：一直留在雲端模式（Firestore 會把這段時間的寫入排著，連回來就同步）；頂端顯示狀態，背景時不算，
// 到期時實際問一次伺服器，問不到就顯示「正在重新連線」並退避重試，問得到就恢復。

/** 從開始等伺服器（或回到前景）起，給 Firestore 自己重連的時間；過了才顯示狀態 */
export const UNAVAILABLE_GRACE_MS = 30_000
/** 問不到伺服器之後，下一次再問要等多久：8 秒起、每次 ×1.5，最多 30 秒 */
export const PROBE_FIRST_MS = 8_000
export const PROBE_MAX_MS = 30_000
/** 額度用完時，多久再試一次 */
export const QUOTA_RETRY_MS = 60_000

/** 頂端的連線狀態：ok 不顯示 */
export type Connection = 'ok' | 'reconnecting' | 'offline' | 'quota'

export type UnavailableStep =
  /** 頁面在背景：先不算，等回到前景重新計時 */
  | 'wait-visible'
  /** 問一次伺服器（手機說沒有網路也問：navigator.onLine 有時不準，問得到就不顯示「沒有網路」） */
  | 'probe'

/** 寬限到期時要做什麼 */
export function unavailableStep(a: { hidden: boolean }): UnavailableStep {
  return a.hidden ? 'wait-visible' : 'probe'
}

export type ProbeResult = 'ok' | 'unreachable' | 'exhausted'

/** Firestore 錯誤碼 → 問伺服器的結果（沒有錯誤、或伺服器回了別的錯例如權限，都代表連得到） */
export function probeResultOf(code: string | undefined): ProbeResult {
  if (code === 'resource-exhausted') return 'exhausted'
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'unreachable'
  return 'ok'
}

/** 問伺服器的結果 → 要顯示的狀態；問不到而且手機說沒有網路，才說「沒有網路」 */
export function connectionAfter(result: ProbeResult, online = true): Connection {
  if (result === 'ok') return 'ok'
  if (result === 'exhausted') return 'quota'
  return online ? 'reconnecting' : 'offline'
}

/** 第 tries 次問不到之後，等多久再問（tries 從 1 開始） */
export function retryDelay(tries: number, result: ProbeResult = 'unreachable'): number {
  if (result === 'exhausted') return QUOTA_RETRY_MS
  return Math.min(PROBE_MAX_MS, Math.round(PROBE_FIRST_MS * 1.5 ** Math.max(0, tries - 1)))
}

/** 匿名登入失敗後，第 n 次（從 0 起）重試前要等多久：1.5 秒起、每次 ×2，最多 30 秒；一直試，不放棄 */
export function authRetryDelay(n: number): number {
  return Math.min(PROBE_MAX_MS, 1_500 * 2 ** n)
}

/** 頂端狀態的文字 */
export const CONNECTION_TEXT: Record<Exclude<Connection, 'ok'>, string> = {
  reconnecting: '連線中斷，正在重新連線…',
  offline: '沒有網路。連回來會自動同步，剛剛做的事不會不見。',
  quota: '雲端暫時忙不過來，正在重試…',
}
