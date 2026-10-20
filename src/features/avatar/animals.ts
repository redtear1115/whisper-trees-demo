// 陪你的動物：地圖上代表使用者的小動物。純資料與驗證，不碰 store（hook 在 useAnimal.ts）。
// 五隻動物、順序與個性來自團隊簡報 v20（2026-10-20）p13，取代 v17 的四隻。

export const ANIMAL_IDS = ['taiwan-dog', 'leopard-cat', 'blue-magpie', 'malayan-night-heron', 'pangolin'] as const
export type AnimalId = (typeof ANIMAL_IDS)[number]

export interface Animal {
  id: AnimalId
  name: string
  /** src/assets.ts 的素材 id */
  art: string
  /** 一句話，給選擇畫面 */
  blurb: string
}

export const ANIMALS: Animal[] = [
  { id: 'taiwan-dog', name: '臺灣黑狗', art: 'avatar-taiwan-dog', blurb: '開朗樂天，開心時繞圈搖鐮刀尾' },
  { id: 'leopard-cat', name: '石虎', art: 'avatar-leopard-cat', blurb: '冷淡的觀察家，安靜坐在樹下' },
  { id: 'blue-magpie', name: '臺灣藍鵲', art: 'avatar-blue-magpie', blurb: '火爆脾氣，有人闖進領域就飛來巴頭' },
  { id: 'malayan-night-heron', name: '黑冠麻鷺', art: 'avatar-malayan-night-heron', blurb: '呆萌的大笨鳥，常在草地上定格發呆' },
  { id: 'pangolin', name: '穿山甲', art: 'avatar-pangolin', blurb: '容易緊張，一害怕就捲成球' },
]

/** 預設是臺灣黑狗（團隊簡報 v20，2026-10-20；v17 時是穿山甲）：新使用者、沒選過、舊資料沒存動物的人都是牠 */
export const DEFAULT_ANIMAL: AnimalId = 'taiwan-dog'

/** 舊版存過的值：夜鷺（v17 前叫黑冠麻鷺、id 一直是 night-heron）對應到黑冠麻鷺；赤腹松鼠已移除，落到預設 */
const LEGACY_ANIMAL: Record<string, AnimalId> = { 'night-heron': 'malayan-night-heron' }

/** 存的值不認得（沒選過、舊資料、被改過）就用預設的臺灣黑狗 */
export function animalOf(id: unknown): Animal {
  const key = typeof id === 'string' ? (LEGACY_ANIMAL[id] ?? id) : id
  return ANIMALS.find((a) => a.id === key) ?? ANIMALS.find((a) => a.id === DEFAULT_ANIMAL)!
}
