// 陪你的動物：地圖上代表使用者的小動物。純資料與驗證，不碰 store（hook 在 useAnimal.ts）。

export const ANIMAL_IDS = ['blue-magpie', 'night-heron', 'squirrel', 'pangolin'] as const
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
  { id: 'blue-magpie', name: '臺灣藍鵲', art: 'avatar-blue-magpie', blurb: '長尾巴的藍色鳥，台灣特有種' },
  { id: 'night-heron', name: '黑冠麻鷺', art: 'avatar-night-heron', blurb: '常在公園草地慢慢走的鳥' },
  { id: 'squirrel', name: '赤腹松鼠', art: 'avatar-squirrel', blurb: '住在行道樹上的小松鼠' },
  { id: 'pangolin', name: '穿山甲', art: 'avatar-pangolin', blurb: '身上有一片一片鱗甲' },
]

export const DEFAULT_ANIMAL: AnimalId = 'blue-magpie'

/** 存的值不認得（沒選過、舊資料、被改過）就用預設的臺灣藍鵲 */
export function animalOf(id: unknown): Animal {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS[0]
}
