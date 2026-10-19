// 陪你的動物：地圖上代表使用者的小動物。純資料與驗證，不碰 store（hook 在 useAnimal.ts）。

export const ANIMAL_IDS = ['pangolin', 'blue-magpie', 'night-heron', 'squirrel'] as const
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
  { id: 'pangolin', name: '穿山甲', art: 'avatar-pangolin', blurb: '身上有一片一片鱗甲' },
  { id: 'blue-magpie', name: '臺灣藍鵲', art: 'avatar-blue-magpie', blurb: '長尾巴的藍色鳥，台灣特有種' },
  { id: 'night-heron', name: '夜鷺', art: 'avatar-night-heron', blurb: '傍晚常在水邊、公園池畔站著的鳥' },
  { id: 'squirrel', name: '赤腹松鼠', art: 'avatar-squirrel', blurb: '住在行道樹上的小松鼠' },
]

/** 預設是穿山甲（團隊簡報 v17，2026-10-20）：新使用者、沒選過、舊資料沒存動物的人都是牠 */
export const DEFAULT_ANIMAL: AnimalId = 'pangolin'

/** 存的值不認得（沒選過、舊資料、被改過）就用預設的穿山甲 */
export function animalOf(id: unknown): Animal {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS.find((a) => a.id === DEFAULT_ANIMAL)!
}
