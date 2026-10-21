// 舊網址轉址：探索與圖鑑併進集章冊，探索區用 ?tab=explore 選取。

export type StampsTab = 'stamps' | 'explore'

export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  '/explore': '/stamps?tab=explore',
  '/codex': '/stamps?tab=explore',
  '/more': '/me',
}

/** /stamps 的 ?tab= 轉成目前的分頁；沒有或不認得就是「集章」 */
export function stampsTabFromSearch(search: string): StampsTab {
  return new URLSearchParams(search).get('tab') === 'explore' ? 'explore' : 'stamps'
}
