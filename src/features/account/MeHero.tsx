import { useId, useState } from 'react'
import { Art } from '../../components/ui'
import { useStore } from '../../store'
import { balance, ledger, useEarned } from '../game/ledger'
import { growthCopy, spendNoteKind, stageOf, stagePath } from '../game/character'
import { useInventory } from '../game/inventory'
import { allItems, useGameConfig } from '../game/config'
import { AnimalPicker } from '../avatar/AnimalPicker'
import { useAnimal } from '../avatar/useAnimal'
import { MoodRow } from '../mood/MoodRow'

/** 小芽身邊的微光：累計光點越多越亮，最多 12 點（位置固定，不亂跳） */
const GLOW_SPOTS = [
  [18, 22], [78, 14], [8, 58], [90, 50], [30, 6], [62, 4], [96, 82], [2, 86], [46, 0], [84, 30], [14, 40], [70, 70],
] as const

export function glowCount(earned: number): number {
  return Math.min(GLOW_SPOTS.length, Math.ceil(Math.max(0, earned) / 15))
}

/**
 * /me 的頂部，主角是小芽：小芽比旁邊陪你的動物大一點，身邊的微光跟著累計光點變多；
 * 成長條是金色的「光」，下面標出三個階段。卡片裡只留「換一隻」與心情一行；「我的區」移到「設定與其他」。
 */
export function MeHero() {
  const animal = useAnimal()
  const earned = useEarned()
  const inv = useInventory()
  const cfg = useGameConfig()
  const note = useStore((s) => spendNoteKind({ balance: balance(s), spent: ledger(s).some((e) => e.delta < 0) }))
  const [picking, setPicking] = useState(false)
  const pickId = useId()
  const { stage } = stageOf(earned)
  const grow = growthCopy(earned, note)
  const path = stagePath(earned)
  const glows = GLOW_SPOTS.slice(0, glowCount(earned))
  const outfit = allItems(cfg).find((i) => i.id === inv.equipped.outfit)

  return (
    <section className="me-hero" aria-labelledby="me-hero-title" data-testid="me-hero">
      <div className="me-scene">
        <div className="me-companion" data-testid="me-animal" data-animal={animal.id}>
          <Art id={animal.art} alt={`陪你的${animal.name}`} />
        </div>
        <div className="me-sprout" data-testid="me-sprout">
          <span className="me-glows" aria-hidden="true" data-count={glows.length}>
            {glows.map(([x, y], i) => (
              <span key={i} className="me-glow" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 4) * 0.7}s` }} />
            ))}
          </span>
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
      <ol className="me-stages" aria-label="小芽的三個階段">
        {path.map((p) => (
          <li key={p.stage.id} className={`${p.reached ? 'reached' : ''} ${p.current ? 'current' : ''}`} aria-current={p.current ? 'step' : undefined}>
            {p.stage.name}
          </li>
        ))}
      </ol>
      {grow.note && <p className="muted small me-hero-note">{grow.note}</p>}
      <div className="me-swap">
        <span className="muted small me-animal-line" data-testid="me-animal-line">
          <strong>{animal.name}</strong>：{animal.blurb}
        </span>
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
      <MoodRow />
    </section>
  )
}
