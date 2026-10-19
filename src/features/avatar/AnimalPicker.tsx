import { Art } from '../../components/ui'
import { ANIMALS } from './animals'
import { setAnimal, useAnimal } from './useAnimal'

/** 選陪你的動物：4 個選項的單選（原生 radio，鍵盤方向鍵可換）。點了立刻存、地圖上的角色立刻換。 */
export function AnimalPicker({ name = 'animal' }: { name?: string }) {
  const current = useAnimal()
  return (
    <fieldset className="animal-picker" data-testid="animal-picker" data-value={current.id}>
      <legend className="sr-only">陪你的動物</legend>
      {ANIMALS.map((a) => (
        <label key={a.id} className={`animal-option ${a.id === current.id ? 'on' : ''}`} data-testid={`animal-option-${a.id}`}>
          <input
            type="radio"
            name={name}
            value={a.id}
            checked={a.id === current.id}
            onChange={() => setAnimal(a.id)}
            className="visually-hidden"
          />
          <Art id={a.art} alt="" className="animal-art" />
          <span className="animal-name">{a.name}</span>
        </label>
      ))}
    </fieldset>
  )
}
