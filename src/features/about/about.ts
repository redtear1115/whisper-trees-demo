// 「關於曦語」頁的內容（團隊簡報 v20）。只放簡報上的事實，沒有聯絡方式。
// 一般的「台北」寫成「臺北」；專有名稱（台北市政 Debug 松、台北市網路公祭網站）照原名。

export interface TeamMember {
  /** 圓形徽章上的一個字 */
  initial: string
  name: string
  title: string
  /** 在本案做了什麼（一行） */
  role: string
  /** 專長，用「・」分隔 */
  skills: string
}

export const TEAM_TAGLINE = '從概念、插畫、數據到打卡機制，一隊打通。'
export const TEAM_SUMMARY = '6 位隊員・設計 2・工程 3・計畫管理 1'

/**
 * 第五輪（2026-10-21，使用者決定）：職稱與「本案」改成簡報之外對外好懂的寫法，一行講這個人在本案做了什麼；
 * 專長是簡報的原文，當作第三行小字。
 */
export const TEAM: readonly TeamMember[] = [
  {
    initial: '愛',
    name: '愛皮卡',
    title: '概念發起人',
    role: '發想曦語的遊戲概念、世界觀與蠟筆繪本畫風',
    skills: 'App・Web・SaaS・SCADA・品牌・插畫・繪本・動畫',
  },
  {
    initial: 'R',
    name: 'Ray',
    title: '軟體工程師',
    role: '整理臺北市樹木開放資料，做出這個網頁 Demo',
    skills: '軟體工程・雲端系統架構・開發流程',
  },
  {
    initial: 'M',
    name: 'Mars／瑪斯',
    title: '計畫管理師',
    role: '數據分析，做出讀取公園處圖資的地圖介面',
    skills: '專案管理・政策研析・網站架構・人才培育',
  },
  {
    initial: '佳',
    name: '佳宜',
    title: '韌體工程師',
    role: '評估樹牌打卡方案（NFC 與 QR Code）',
    skills: 'MCU・穿戴裝置・藍牙・心率與陀螺儀感測',
  },
  {
    initial: '薄',
    name: '薄荷',
    title: '後端工程師・專案經理',
    role: '評估樹牌打卡方案，畫出遊戲操作流程',
    skills: 'C#・Java・MSSQL；台北市網路公祭網站',
  },
  {
    initial: '克',
    name: '克洛伊伊',
    title: 'UI/UX 設計師',
    role: 'Figma 介面設計與 UX 數據',
    skills: 'UI design・UX research・System & IA・拍攝剪輯',
  },
]

export const BRAND_SPIRIT = [
  { name: '慢下來', line: '不刷步數，邀請市民停下腳步，與一棵樹好好相處。' },
  { name: '無壓陪伴', line: '私密樹洞，無按讚、無留言，只有溫柔的微光共鳴。' },
  { name: '共好城市', line: '每一次打卡、回報與澆水，都在把樹種回臺北。' },
] as const
