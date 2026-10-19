// 市民端底部導覽：5 個分頁的順序與「現在在哪一頁」。純函式，方便測試。

export type TabId = 'stamps' | 'explore' | 'home' | 'journal' | 'me'

export interface Tab {
  id: TabId
  to: string
  label: string
}

/** 由左到右；首頁（地圖）在中間 */
export const TABS: readonly Tab[] = [
  { id: 'stamps', to: '/stamps', label: '集章冊' },
  { id: 'explore', to: '/explore', label: '探索' },
  { id: 'home', to: '/', label: '首頁' },
  { id: 'journal', to: '/journal', label: '樹洞' },
  { id: 'me', to: '/me', label: '我的' },
]

/**
 * 目前路徑屬於哪個分頁；不是分頁根頁面（例如 /tree/:id、/shop、/wishes）回傳 null，
 * 這些子頁面不顯示底部導覽，用返回連結離開。尾端的斜線不影響。
 */
export function activeTab(pathname: string): TabId | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return TABS.find((t) => t.to === path)?.id ?? null
}

/** 中間的大按鈕：在首頁是「掃樹牌」，在其他分頁是「回首頁」 */
export interface CenterAction {
  kind: 'scan' | 'home'
  to: '/scan' | '/'
  label: string
}

export function centerAction(active: TabId | null): CenterAction {
  return active === 'home' ? { kind: 'scan', to: '/scan', label: '掃樹牌' } : { kind: 'home', to: '/', label: '首頁' }
}

/** 這個路徑要不要顯示底部導覽 */
export function showNav(pathname: string): boolean {
  return activeTab(pathname) !== null
}
