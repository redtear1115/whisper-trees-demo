// 受保護樹木（珍貴老樹）：打卡基礎光點 20。
//
// 2026-10-20 查過 material/raw/TaipeiTree.csv、TaipeiParkTree.csv 與 build_web_data.py 輸出：
// 開放資料裡**沒有**受保護樹木的欄位或備註（RegionRemark 只有方位與「安全島」），
// 受保護樹木是台北市另一份名冊，目前 material/ 沒有它。所以這裡不編造：名單是空的，
// 規則（GM 的「受保護樹木基礎光點」）已經實作，名冊接上後才會生效。
// 接法：把名冊的 TreeID 放進下面這個集合（或由 scripts/ 產生），不用改其他程式。

const PROTECTED_TREE_IDS: ReadonlySet<string> = new Set<string>()

export function isProtectedTree(treeId: string): boolean {
  return PROTECTED_TREE_IDS.has(treeId)
}
