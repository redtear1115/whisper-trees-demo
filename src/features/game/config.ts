// 遊戲參數：由 GM 後台調整，存在 store 的 ext.gm。規則見 docs/specs/08-extensions.md

import { getExt, setExt, useStore, type State } from '../../store'

export type Action = 'checkin' | 'farView' | 'sun' | 'whisper' | 'wish' | 'water'

export const ACTION_LABEL: Record<Action, string> = {
  checkin: '打卡成功',
  farView: '遠觀模式打卡',
  sun: '白天打卡的日照加成',
  whisper: '留樹洞',
  wish: '許願',
  water: '澆水',
}

export interface GameEvent {
  id: string
  name: string
  /** YYYY-MM-DD，含當天 */
  start: string
  end: string
  multiplier: number
}

export type ItemKind = 'outfit' | 'frame' | 'civic'

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
  points: Record<Action, number>
  multiplier: number
  events: GameEvent[]
  shop: ShopItem[]
}

export const DEFAULT_SHOP: ShopItem[] = [
  { id: 'hat-straw', name: '草帽', kind: 'outfit', price: 30, active: true, art: 'item-hat-straw', brief: '夏天曬太陽也不怕' },
  { id: 'scarf-leaf', name: '落葉圍巾', kind: 'outfit', price: 50, active: true, art: 'item-scarf-leaf', brief: '用楓香葉子織的' },
  { id: 'lantern', name: '螢火提燈', kind: 'outfit', price: 80, active: true, art: 'item-lantern', brief: '夜裡陪樹說話時用' },
  { id: 'frame-spring', name: '春櫻相框', kind: 'frame', price: 40, active: true, art: 'item-frame-spring', brief: '樹的頁面換上春天' },
  { id: 'frame-autumn', name: '秋楓相框', kind: 'frame', price: 40, active: true, art: 'item-frame-autumn', brief: '樹的頁面換上秋天' },
  { id: 'fund-10', name: '捐 1 棵樹苗的一小步', kind: 'civic', price: 100, active: true, art: 'item-fund', brief: '光點捐給補種基金（示意，目前不會真的捐款）' },
  { id: 'water-bag', name: '認養一個澆水袋', kind: 'civic', price: 150, active: true, art: 'item-water-bag', brief: '新植樹苗的緩釋澆水袋（示意）' },
]

export const DEFAULT_CONFIG: GameConfig = {
  points: { checkin: 10, farView: 5, sun: 2, whisper: 3, wish: 5, water: 2 },
  multiplier: 1,
  events: [{ id: 'ev-arbor', name: '植樹節雙倍光點', start: '2027-03-12', end: '2027-03-14', multiplier: 2 }],
  shop: DEFAULT_SHOP,
}

export function gameConfig(s?: State): GameConfig {
  const saved = getExt<Partial<GameConfig>>('gm', {}, s)
  return { ...DEFAULT_CONFIG, ...saved, points: { ...DEFAULT_CONFIG.points, ...saved.points } }
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
