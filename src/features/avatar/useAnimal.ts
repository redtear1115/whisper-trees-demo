import { useStore } from '../../store'
import { onboarding, patchOnboarding } from '../game/onboarding'
import { animalOf, type Animal, type AnimalId } from './animals'

/** 目前陪著你的動物。selector 回傳字串 id（不是新物件），不會每次都重新渲染。 */
export function useAnimal(): Animal {
  const id = useStore((s) => animalOf(onboarding(s).animal).id)
  return animalOf(id)
}

/** 換動物：存在 onboarding.animal（雲端是 users/{uid}.onboarding 的欄位，逐欄合併） */
export function setAnimal(id: AnimalId) {
  patchOnboarding({ animal: id })
}
