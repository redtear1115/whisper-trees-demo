// 遊戲參數：由 GM 後台調整，存在 store 的 ext.gm。規則見 docs/specs/08-extensions.md

import { getExt, setExt, useStore, type State } from '../../store'

/** `sun` 是舊版的獨立日照加成（2026-10-20 前的流水帳還有），現在日照是倍率，不再單獨發 */
export type Action = 'checkin' | 'farView' | 'sun' | 'whisper' | 'report' | 'wish' | 'water' | 'insect'

export const ACTION_LABEL: Record<Action, string> = {
  checkin: '打卡成功',
  farView: '遠觀模式打卡',
  sun: '白天打卡的日照加成',
  whisper: '留樹洞',
  report: '樹況回報',
  wish: '許願',
  water: '澆水',
  insect: '樹上住戶',
}

/** 有固定點數、GM 可以直接改的行為。樹洞與同一棵樹的後續互動看 `ladder2`／`ladder3`。 */
export type PointAction = 'checkin' | 'farView' | 'report' | 'wish' | 'water'

/** 「在一棵樹旁」做的互動：每棵樹每天依序算第 1、2、3 個（見 points.ts） */
export const TREE_ACTIONS: readonly Action[] = ['checkin', 'farView', 'whisper', 'report']

export interface GameEvent {
  id: string
  name: string
  /** YYYY-MM-DD，含當天 */
  start: string
  end: string
  multiplier: number
}

export type ItemKind = 'outfit' | 'frame'

export interface ShopItem {
  id: string
  name: string
  kind: ItemKind
  price: number
  active: boolean
  /** 佔位美術 ID，見 src/assets.ts */
  art: string
  brief: string
}

export interface GameConfig {
  points: Record<PointAction, number>
  /** 同一棵樹當天的第 2、第 3 個互動（打卡、遠觀、樹洞、回報各算一個）；第 4 個起不再發 */
  ladder2: number
  ladder3: number
  /** 日照加成的最高倍率：正午前後最高，日出與日落是 ×1，夜間 ×1 */
  sunMax: number
  /** 寂寞樹：超過幾天沒人拜訪才算 */
  lonelyDays: number
  /** 剛達門檻時的倍率、以及上限；之間每多 lonelyStepDays 天加 ×1 */
  lonelyMin: number
  lonelyMax: number
  lonelyStepDays: number
  /** 受保護樹木打卡的基礎光點（取代 points.checkin） */
  protectedBase: number
  /** 一天裡從第幾棵不同的樹起，打卡光點減半 */
  halveFrom: number
  /** 樹上住戶（昆蟲彩蛋，模擬）：打卡成功時出現的機率，0～1 */
  insectChance: number
  /** 樹上住戶出現時的額外光點 */
  insectBonus: number
  multiplier: number
  events: GameEvent[]
  shop: ShopItem[]
}

// 商店只賣虛擬造型與相框（團隊簡報 v20 p25，2026-10-20）；造型要能疊在五隻動物與小芽身上。
export const DEFAULT_SHOP: ShopItem[] = [
  { id: 'hat-acorn', name: '橡實帽', kind: 'outfit', price: 30, active: true, art: 'item-hat-acorn', brief: '用橡實殼做的小帽子' },
  { id: 'crown-feather', name: '花冠羽毛', kind: 'outfit', price: 50, active: true, art: 'item-crown-feather', brief: '野花編的花冠，插著一根羽毛' },
  { id: 'cape-moss', name: '苔蘚斗篷', kind: 'outfit', price: 80, active: true, art: 'item-cape-moss', brief: '軟軟綠綠的苔蘚，披在肩上' },
  { id: 'frame-spring', name: '春櫻相框', kind: 'frame', price: 40, active: true, art: 'item-frame-spring', brief: '樹的頁面換上春天' },
  { id: 'frame-autumn', name: '秋楓相框', kind: 'frame', price: 40, active: true, art: 'item-frame-autumn', brief: '樹的頁面換上秋天' },
]

/** 簡報 v20 前的造型 id 對應到新的（只有這三個；稀有的古木紋理頭飾 hat-ancient 與相框不動）。讀 inventory 與 GM 存過的商品時都要走這個 */
export const LEGACY_ITEM_ID: Record<string, string> = {
  'hat-straw': 'hat-acorn',
  'scarf-leaf': 'crown-feather',
  lantern: 'cape-moss',
}

export function canonicalItemId(id: string): string {
  return LEGACY_ITEM_ID[id] ?? id
}

/**
 * GM 存過的商品清單可能還是舊的：舊造型換成新名字與素材（保留價格與上下架），
 * 舊的「回到城市」商品（civic）整個拿掉。
 */
function normalizeShop(shop: ShopItem[]): ShopItem[] {
  const out: ShopItem[] = []
  for (const raw of shop) {
    if ((raw.kind as string) === 'civic') continue
    const id = canonicalItemId(raw.id)
    const base = DEFAULT_SHOP.find((d) => d.id === id)
    const item = id === raw.id || !base ? raw : { ...base, price: raw.price, active: raw.active }
    if (!out.some((o) => o.id === item.id)) out.push(item)
  }
  return out
}

/**
 * 稀有配件：不在商店賣、不能用光點買，只能掉落（目前只有古木紋理頭飾，在受保護樹木第一次打卡成功時拿到，見 drops.ts）。
 * 它不受 GM 的商店設定影響，所以另外放；穿戴與顯示時用 allItems 一起找。
 */
export const RARE_ITEMS: ShopItem[] = [
  { id: 'hat-ancient', name: '古木紋理頭飾', kind: 'outfit', price: 0, active: false, art: 'item-hat-ancient', brief: '稀有・受保護樹木' },
]

/** 商店商品加稀有配件（用 id 找擁有的造型時用） */
export function allItems(cfg: GameConfig): ShopItem[] {
  return [...cfg.shop, ...RARE_ITEMS]
}

export const DEFAULT_CONFIG: GameConfig = {
  points: { checkin: 10, farView: 5, report: 15, wish: 5, water: 3 },
  ladder2: 2,
  ladder3: 1,
  sunMax: 1.5,
  lonelyDays: 30,
  lonelyMin: 2,
  lonelyMax: 5,
  lonelyStepDays: 20,
  protectedBase: 20,
  halveFrom: 11,
  insectChance: 0.15,
  insectBonus: 3,
  multiplier: 1,
  events: [{ id: 'ev-arbor', name: '植樹節雙倍光點', start: '2027-03-12', end: '2027-03-14', multiplier: 2 }],
  shop: DEFAULT_SHOP,
}

export function gameConfig(s?: State): GameConfig {
  const saved = getExt<Partial<GameConfig>>('gm', {}, s)
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    points: { ...DEFAULT_CONFIG.points, ...saved.points },
    shop: saved.shop ? normalizeShop(saved.shop) : DEFAULT_CONFIG.shop,
  }
}

let cache: { src: unknown; cfg: GameConfig } | null = null
export function useGameConfig(): GameConfig {
  return useStore((s) => {
    if (!cache || cache.src !== s.ext.gm) cache = { src: s.ext.gm, cfg: gameConfig(s) }
    return cache.cfg
  })
}

export function saveGameConfig(patch: Partial<GameConfig>) {
  setExt('gm', { ...gameConfig(), ...patch })
}

export function resetGameConfig() {
  setExt('gm', {})
}

/** 今天進行中的活動（取倍率最高的一個） */
export function activeEvent(cfg: GameConfig, today: string): GameEvent | undefined {
  return cfg.events
    .filter((e) => e.start <= today && today <= e.end)
    .sort((a, b) => b.multiplier - a.multiplier)[0]
}

/** 光點規則一覽（新手引導與說明用）：行為與點數的文字 */
export function pointRows(cfg: GameConfig): [string, string][] {
  const p = cfg.points
  return [
    ['在樹旁打卡', `+${p.checkin}（白天最高 ×${cfg.sunMax}）`],
    ['同一棵樹的第 2、第 3 個互動', `+${cfg.ladder2}、+${cfg.ladder3}`],
    ['遠觀模式打卡', `+${p.farView}`],
    ['樹況回報', `+${p.report}`],
    ['在空樹穴許願', `+${p.wish}`],
    ['幫別人的願望澆水', `+${p.water}`],
  ]
}
