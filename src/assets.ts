import { isDebugMode } from './lib/debug'

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
  { id: 'sprout-0', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」＝樹精（團隊簡報 v20 p14），第 1 階：初心樹精。2.5D 蠟筆繪本風，剛醒來、圓圓小小、頭上一片新芽、眼神好奇，透明背景' },
  { id: 'sprout-1', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 2 階：茁壯樹精。同一個角色長大了，身形變穩、枝葉變多，樹皮紋路出現（規格同上）' },
  { id: 'sprout-2', w: 240, h: 240, where: '我的小芽', brief: '角色「小芽」第 3 階：智慧老樹精。同一個角色的老年樣子，樹冠茂密、鬍鬚般的垂枝與苔蘚，神情溫和（規格同上）' },
  { id: 'item-hat-acorn', w: 160, h: 160, where: '商店、小芽換裝、新手禮', brief: '造型：橡實帽（疊在五隻動物與小芽身上，透明背景）。新手禮' },
  { id: 'item-crown-feather', w: 160, h: 160, where: '商店、小芽換裝', brief: '造型：花冠羽毛（花環插一根羽毛，疊在五隻動物與小芽身上，透明背景）' },
  { id: 'item-cape-moss', w: 160, h: 160, where: '商店、小芽換裝', brief: '造型：苔蘚斗篷（披在肩上，疊在五隻動物與小芽身上，透明背景）' },
  { id: 'item-hat-ancient', w: 160, h: 160, where: '小芽換裝、打卡後的稀有配件卡', brief: '稀有配件：古木紋理頭飾，木紋年輪，疊在角色上，透明背景（只能在受保護樹木掉落，不在商店賣）' },
  { id: 'item-frame-spring', w: 160, h: 160, where: '商店', brief: '樹的頁面相框：春櫻（商品縮圖；實際相框另需 720×400 外框）' },
  { id: 'item-frame-autumn', w: 160, h: 160, where: '商店', brief: '樹的頁面相框：秋楓（同上）' },
  { id: 'insect-ladybug', w: 120, h: 120, where: '圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬）', brief: '樹上住戶：瓢蟲，蠟筆繪本風，小、透明背景' },
  { id: 'insect-beetle', w: 120, h: 120, where: '圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬）', brief: '樹上住戶：獨角仙，蠟筆繪本風，小、透明背景' },
  { id: 'insect-cicada', w: 120, h: 120, where: '圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬）', brief: '樹上住戶：蟬（只在 5～9 月出現），蠟筆繪本風，小、透明背景' },
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
  { id: 'avatar-taiwan-dog', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：臺灣黑狗（預設）。開朗樂天，鐮刀尾是招牌。2.5D 繪本風的小動物站著、正面朝向鏡頭，透明背景，腳底在圖的下緣中央（地圖定位點）。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。' },
  { id: 'avatar-leopard-cat', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：石虎。冷淡的觀察家，耳後白斑是招牌。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。' },
  { id: 'avatar-blue-magpie', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：臺灣藍鵲。火爆脾氣，長尾巴。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。' },
  { id: 'avatar-malayan-night-heron', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：黑冠麻鷺。呆萌的大笨鳥，常定格發呆、偶爾歪頭。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。' },
  { id: 'avatar-pangolin', w: 96, h: 96, where: '地圖上代表你、新手引導、我的', brief: '地圖人物：穿山甲。容易緊張，緊張時捲成球。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。' },
  { id: 'action-scan', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：掃樹牌打卡（QR Code 框）。發光圓圈裡的單色小圖示，透明背景，灰色狀態由程式處理' },
  { id: 'action-whisper', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹洞（樹幹上的小洞或對話氣泡）。規格同上' },
  { id: 'action-info', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹的資料（樹牌或葉子加一個 i）。規格同上' },
  { id: 'action-report', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：樹況回報（剪刀或旗標）。規格同上' },
  { id: 'action-route', w: 64, h: 64, where: '點樹後的行動圈', brief: '圖示：怎麼走（彎彎的路線加一個終點標記）。規格同上' },
  { id: 'action-walk', w: 64, h: 64, where: '點樹後的行動圈（只有 Demo 模式）', brief: '圖示：走過去（腳印）。規格同上' },
  { id: 'fog-empty', w: 240, h: 160, where: '探索頁空狀態（還沒打卡）', brief: '繪本風：一棵小樹苗被淡淡的霧蓋住，旁邊一盞小提燈；暖黃光暈、蠟筆質感，透明背景，主體置中、四周留白' },
]

export function assetUrl(id: string): string {
  // 公民看到的佔位檔沒有任何標示文字；?debug=1 才改載入帶「id 佔位」標示的版本（public/assets/ph-debug/）
  return `${import.meta.env.BASE_URL}assets/${isDebugMode() ? 'ph-debug' : 'ph'}/${id}.svg`
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
