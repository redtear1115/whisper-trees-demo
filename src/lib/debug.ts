// 除錯旗標：網址帶 ?debug=1 時為真，同一個分頁（sessionStorage）內換頁也維持，和 Demo 模式同一種做法。
// 目前只有一個用途：佔位美術要不要顯示「id 佔位」「尺寸 佔位」的標示文字（公民看到的畫面不能有）。
const KEY = 'whisper-trees:debug'

export function isDebugMode(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('debug')
    if (q === '1') {
      sessionStorage.setItem(KEY, '1')
      return true
    }
    if (q === '0') {
      sessionStorage.removeItem(KEY)
      return false
    }
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
