// 門檻值與 Demo 設定集中在這裡，Demo 前依現場測試調整。

export const CHECKIN = {
  /** 打卡成功：d ≤ nearMeters + min(accuracy, maxAccuracyBonus) */
  nearMeters: 30,
  maxAccuracyBonus: 30,
  /** 遠觀模式（安全島樹）的距離上限 */
  farViewMeters: 80,
  /** 定位逾時 */
  geoTimeoutMs: 10_000,
  /** Demo 模式「走過去」：站到樹旁幾公尺 */
  demoOffsetMeters: 10,
  /** Demo 模擬位置的定位誤差（公尺）：打卡判斷與地圖感應圈共用 */
  demoAccuracy: 5,
  /** 打卡後多久內重新整理樹的頁面仍算在現場 */
  sessionMinutes: 30,
}

/** 東門市場周邊，「誤砍茄苳」事件的街廓 */
export const DEMO = {
  center: [121.5287, 25.0335] as [number, number],
  zoom: 16.5,
  /** 信義路二段的真實茄苳行道樹（開放資料樹籍編號） */
  treeId: 'DA0030211045',
  qrText: 'http://trees.gov.taipei/show/?treeid=DA0030211045',
}

/** 「附近」模式：45° 俯視，只能在目前位置周圍移動 */
export const NEAR = {
  radiusMeters: 300,
  pitch: 45,
  bearing: -20,
  /** 街景：只看得到你所在的那條街（2026-10-19 決定） */
  zoom: 18.5,
  minZoom: 16,
}

export const DATA_VERSION = '2026-10-16'

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
