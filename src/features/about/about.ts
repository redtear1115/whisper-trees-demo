// 「關於曦語」頁的內容（團隊簡報 v20）。只放簡報上的事實，沒有聯絡方式。

export interface TeamMember {
  /** 圓形徽章上的一個字 */
  initial: string
  name: string
  title: string
  /** 本案做了什麼 */
  role: string
  /** 專長，用「・」分隔 */
  skills: string
}

export const TEAM_TAGLINE = '從概念、插畫、數據到打卡機制，一隊打通。'
export const TEAM_SUMMARY = '6 位隊員・設計 2・工程 3・計畫管理 1'

export const TEAM: readonly TeamMember[] = [
  {
    initial: '愛',
    name: '愛皮卡',
    title: '概念發起人',
    role: '遊戲概念發想、世界觀與繪畫風格',
    skills: 'App・Web・SaaS・SCADA・品牌・插畫・繪本・動畫',
  },
  {
    initial: 'R',
    name: 'Ray',
    title: 'kdan.com 打工仔',
    role: '整理市府樹木開放資料；會後半小時內用簡報生成影片',
    skills: '軟體工程・雲端系統架構・開發流程',
  },
  {
    initial: 'M',
    name: 'Mars／瑪斯',
    title: '法人單位計畫管理師',
    role: '數據分析；製作讀取公園處圖資的地圖介面',
    skills: '專案管理・政策研析・網站架構・人才培育',
  },
  {
    initial: '佳',
    name: '佳宜',
    title: '韌體工程師',
    role: '評估 NFC 與 QR Code 方案',
    skills: 'MCU・穿戴裝置・藍牙・心率與陀螺儀感測',
  },
  {
    initial: '薄',
    name: '薄荷',
    title: '後端工程師 & 專案經理',
    role: '評估 NFC 與 QR Code 方案；週一提供遊戲操作 wireframe',
    skills: 'C#・Java・MSSQL；台北市網路公祭網站',
  },
  {
    initial: '克',
    name: '克洛伊伊',
    title: 'UI/UX Designer',
    role: 'Figma 與 UX 數據',
    skills: 'UI design・UX research・System & IA・拍攝剪輯',
  },
]

export const BRAND_SPIRIT = [
  { name: '慢下來', line: '不刷步數，邀請市民停下腳步，與一棵樹好好相處。' },
  { name: '無壓陪伴', line: '私密樹洞，無按讚、無留言，只有溫柔的微光共鳴。' },
  { name: '共好城市', line: '每一次打卡、回報與澆水，都在把樹種回台北。' },
] as const
