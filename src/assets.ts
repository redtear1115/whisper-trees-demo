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
  { id: 'stamp-iron', w: 120, h: 120, where: '集章冊', brief: '行政區集章：鐵章（打卡 1 棵不同的樹）。圓形印章，中間留空放行政區名' },
  { id: 'stamp-bronze', w: 120, h: 120, where: '集章冊', brief: '行政區集章：銅章（10 棵）。同一組造型，材質不同' },
  { id: 'stamp-silver', w: 120, h: 120, where: '集章冊', brief: '行政區集章：銀章（50 棵）' },
  { id: 'stamp-gold', w: 120, h: 120, where: '集章冊', brief: '行政區集章：金章（200 棵）' },
  { id: 'avatar-blue-magpie', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：臺灣藍鵲（預設）。2.5D 繪本風的小動物站著、正面朝向鏡頭，透明背景，腳底在圖的下緣中央（地圖定位點）' },
  { id: 'avatar-night-heron', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：黑冠麻鷺。規格同上（2.5D 繪本風、站著、正面、透明背景、腳底在下緣中央）' },
  { id: 'avatar-squirrel', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：赤腹松鼠。規格同上' },
  { id: 'avatar-pangolin', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：穿山甲。規格同上' },
  { id: 'action-scan', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：掃樹牌打卡（QR Code 框）。發光圓圈裡的單色小圖示，透明背景，灰色狀態由程式處理' },
  { id: 'action-whisper', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹洞（樹幹上的小洞或對話氣泡）。規格同上' },
  { id: 'action-info', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹的資料（樹牌或葉子加一個 i）。規格同上' },
  { id: 'action-report', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹況回報（剪刀或旗標）。規格同上' },
  { id: 'action-walk', w: 64, h: 64, where: '點樹後的行動圈（只有 Demo 模式）', brief: '圖示：走過去（腳印）。規格同上' },
]

export function assetUrl(id: string): string {
  return `${import.meta.env.BASE_URL}assets/ph/${id}.svg`
}

/** PWA 圖示（加到手機主畫面用）。佔位檔是 PNG，由 make_placeholders 產生到 public/assets/pwa/；設計交件後用同名檔案取代。 */
export interface PwaIconSpec {
  file: string
  size: number
  brief: string
}

export const PWA_ICONS: PwaIconSpec[] = [
  { file: 'icon-192.png', size: 192, brief: 'Android 主畫面與 manifest 圖示。滿版底色，主體放在中間 80%（也當遮罩圖示用）' },
  { file: 'icon-512.png', size: 512, brief: 'manifest 大圖示、啟動畫面。規格同上' },
  { file: 'apple-touch-icon.png', size: 180, brief: 'iOS 加入主畫面的圖示。不透明、不要自己切圓角（系統會切）' },
]
