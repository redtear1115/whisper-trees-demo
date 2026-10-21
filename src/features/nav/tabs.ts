// 市民端底部導覽：4 個分頁加中間的「掃樹牌」，以及「現在在哪一頁」。純函式，方便測試。

export type TabId = 'home' | 'stamps' | 'journal' | 'me'

export interface Tab {
  id: TabId
  to: string
  label: string
}

/** 4 個分頁（首頁就是普通的一頁，在最左） */
export const TABS: readonly Tab[] = [
  { id: 'home', to: '/', label: '首頁' },
  { id: 'stamps', to: '/stamps', label: '集章冊' },
  { id: 'journal', to: '/journal', label: '樹洞' },
  { id: 'me', to: '/me', label: '我的' },
]

/** 導覽列由左到右 5 格：首頁・集章冊・［掃樹牌］・樹洞・我的 */
export const NAV_SLOTS: readonly (TabId | 'scan')[] = ['home', 'stamps', 'scan', 'journal', 'me']

/**
 * 目前路徑屬於哪個分頁；不是分頁根頁面（例如 /tree/:id、/shop、/wishes）回傳 null，
 * 這些子頁面不顯示底部導覽，用返回連結離開。尾端的斜線不影響。
 */
export function activeTab(pathname: string): TabId | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return TABS.find((t) => t.to === path)?.id ?? null
}

/** 中間的大按鈕：每個分頁都是「掃樹牌」，直接到掃描頁 */
export interface CenterAction {
  kind: 'scan'
  to: '/scan'
  label: string
}

export function centerAction(): CenterAction {
  return { kind: 'scan', to: '/scan', label: '掃樹牌' }
}

/**
 * 按「掃樹牌」時要帶去掃描頁的 state：只有在首頁（地圖）、而且地圖上選了樹，才帶那棵樹當提示；
 * 其他分頁沒有「選了哪棵樹」這件事，不帶。
 */
export function scanState(active: TabId | null, hintTreeId: string | null): { hintTreeId: string } | undefined {
  return active === 'home' && hintTreeId ? { hintTreeId } : undefined
}

/** 掃描頁關閉後一律回首頁地圖（不是上一頁：從哪個分頁來都一樣） */
export const SCAN_CLOSE_TO = '/'

/** 這個路徑要不要顯示底部導覽 */
export function showNav(pathname: string): boolean {
  return activeTab(pathname) !== null
}
