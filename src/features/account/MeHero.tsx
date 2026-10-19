import { useId, useState } from 'react'
import { Art } from '../../components/ui'
import { useEarned } from '../game/ledger'
import { growthCopy, stageOf } from '../game/character'
import { useInventory } from '../game/inventory'
import { useGameConfig } from '../game/config'
import { AnimalPicker } from '../avatar/AnimalPicker'
import { useAnimal } from '../avatar/useAnimal'

/** /me 的頂部：陪你的動物（地圖上的那一隻）守著小芽，下面是小芽的成長；「換一隻」就在這裡 */
export function MeHero() {
  const animal = useAnimal()
  const earned = useEarned()
  const inv = useInventory()
  const cfg = useGameConfig()
  const [picking, setPicking] = useState(false)
  const pickId = useId()
  const { stage } = stageOf(earned)
  const grow = growthCopy(earned)
  const outfit = cfg.shop.find((i) => i.id === inv.equipped.outfit)

  return (
    <section className="me-hero" aria-labelledby="me-hero-title" data-testid="me-hero">
      <div className="me-scene">
        <div className="me-companion" data-testid="me-animal" data-animal={animal.id}>
          <Art id={animal.art} alt={`陪你的${animal.name}`} />
        </div>
        <div className="me-sprout">
          <Art id={stage.art} alt={`小芽：${stage.name}`} />
          {outfit && <Art id={outfit.art} alt={outfit.name} className="outfit" />}
        </div>
      </div>
      <h2 id="me-hero-title" className="me-hero-title">
        {animal.name}和{grow.headline}
      </h2>
      <p className="me-hero-line">{grow.line}</p>
      <div
        className="me-grow"
        role="progressbar"
        aria-label="小芽的成長"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={grow.percent}
        aria-valuetext={grow.valuetext}
        data-testid="sprout-progress"
      >
        <div style={{ width: `${grow.percent}%` }} />
      </div>
      {grow.note && <p className="muted small me-hero-note">{grow.note}</p>}
      <div className="me-swap">
        <span className="muted small">{animal.blurb}</span>
        <button
          type="button"
          className="btn me-swap-btn"
          aria-expanded={picking}
          aria-controls={pickId}
          onClick={() => setPicking((v) => !v)}
          data-testid="swap-animal"
        >
          {picking ? '收起' : '換一隻'}
        </button>
      </div>
      <div id={pickId} hidden={!picking}>
        {picking && <AnimalPicker name="me-animal" />}
      </div>
    </section>
  )
}
