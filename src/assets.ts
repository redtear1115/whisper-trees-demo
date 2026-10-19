// UX/UI 美術素材清單。目前全部用佔位檔（public/assets/ph/<id>.svg），
// 由 `node scripts/make_placeholders.mjs` 依這份清單產生，同時輸出 docs/ui-assets.md 交給設計。
// 設計交件時用同名檔案（建議 .webp / .svg）取代即可。

export interface AssetSpec {
  id: string
  w: number
  h: number
  /** 用在哪個畫面 */
  where: string
  /** 給設計的說明 */
  brief: string
}

export const ASSETS: AssetSpec[] = [
  { id: 'logo', w: 160, h: 48, where: '頁首', brief: '曦語 Whisper Trees 字標，蠟筆手繪感' },
  { id: 'tree-hero', w: 720, h: 400, where: '樹的頁面頂部', brief: '2.5D 斜俯視的一棵行道樹與人行道，繪本風；日間版' },
  { id: 'tree-hero-night', w: 720, h: 400, where: '樹的頁面頂部（夜間）', brief: '同上夜間版，「樹木休息中」的氣氛' },
  { id: 'glow', w: 96, h: 96, where: '微光、光點', brief: '一道微光／光點的圖示，柔和發光' },
  { id: 'capsule', w: 96, h: 96, where: '時空膠囊卡片', brief: '時空膠囊（信封或種子膠囊）' },
  { id: 'sapling', w: 96, h: 96, where: '許願、地圖許願圖層', brief: '小樹苗；地圖上依澆水數放大' },
  { id: 'watering', w: 96, h: 96, where: '澆水按鈕', brief: '澆水壺' },
  { id: 'empty-pit', w: 96, h: 96, where: '空樹穴抽屜', brief: '空的樹穴（方形土坑）' },
  { id: 'scan-tag', w: 240, h: 160, where: '掃樹牌說明', brief: '公園處樹牌與 QR Code 的位置示意' },
  { id: 'sprout-0', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 1 階：種子' },
  { id: 'sprout-1', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 2 階：發芽' },
  { id: 'sprout-2', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 3 階：小樹苗' },
  { id: 'sprout-3', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 4 階：小樹' },
  { id: 'sprout-4', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 5 階：大樹' },
  { id: 'item-hat-straw', w: 160, h: 160, where: '商店、小芽換裝', brief: '造型：草帽（疊在角色上，透明背景）' },
  { id: 'item-scarf-leaf', w: 160, h: 160, where: '商店、小芽換裝', brief: '造型：落葉圍巾（疊在角色上，透明背景）' },
  { id: 'item-lantern', w: 160, h: 160, where: '商店、小芽換裝', brief: '造型：螢火提燈（疊在角色上，透明背景）' },
  { id: 'item-frame-spring', w: 160, h: 160, where: '商店', brief: '樹的頁面相框：春櫻（商品縮圖；實際相框另需 720×400 外框）' },
  { id: 'item-frame-autumn', w: 160, h: 160, where: '商店', brief: '樹的頁面相框：秋楓（同上）' },
  { id: 'item-fund', w: 160, h: 160, where: '商店', brief: '回到城市：捐給補種基金' },
  { id: 'item-water-bag', w: 160, h: 160, where: '商店', brief: '回到城市：認養新植樹苗的澆水袋' },
  { id: 'species-card', w: 160, h: 160, where: '圖鑑', brief: '樹種卡通用底圖；正式版每個樹種一張（先做前 40 名，清單見 public/data/species.json）' },
  { id: 'badge-first', w: 120, h: 120, where: '成長徽章', brief: '第一次相遇' },
  { id: 'badge-species-3', w: 120, h: 120, where: '成長徽章', brief: '認識三種樹' },
  { id: 'badge-species-10', w: 120, h: 120, where: '成長徽章', brief: '樹的朋友（10 種）' },
  { id: 'badge-far-view', w: 120, h: 120, where: '成長徽章', brief: '遠遠看著你（安全島樹）' },
  { id: 'badge-capsule', w: 120, h: 120, where: '成長徽章', brief: '時空膠囊（回到同一棵樹）' },
  { id: 'badge-wisher', w: 120, h: 120, where: '成長徽章', brief: '種下一個願望' },
  { id: 'badge-waterer', w: 120, h: 120, where: '成長徽章', brief: '澆水十次' },
  { id: 'badge-night', w: 120, h: 120, where: '成長徽章', brief: '夜行者（夜間打卡）' },
  { id: 'badge-reporter', w: 120, h: 120, where: '成長徽章', brief: '樹的守望者（樹況回報）' },
  { id: 'badge-first-light', w: 120, h: 120, where: '成長徽章', brief: '第一道光（第一次收集光點）' },
  { id: 'badge-home-screen', w: 120, h: 120, where: '成長徽章', brief: '回家的路（從手機桌面圖示打開）' },
  { id: 'badge-newcomer', w: 120, h: 120, where: '成長徽章', brief: '城市的新朋友（完成新手任務）' },
]

export function assetUrl(id: string): string {
  return `${import.meta.env.BASE_URL}assets/ph/${id}.svg`
}
