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
]

export function assetUrl(id: string): string {
  return `${import.meta.env.BASE_URL}assets/ph/${id}.svg`
}
