import { Art, Card, MockTag } from '../components/ui'
import { equip, useInventory } from '../features/game/inventory'
import { useGameConfig } from '../features/game/config'
import { TabHeader } from '../features/nav/TabLayout'
import { SettingsSection } from '../features/account/SettingsSection'
import { MeHero } from '../features/account/MeHero'
import { LedgerSection } from '../features/account/LedgerSection'
import { BadgesSection } from '../features/account/BadgesSection'
import { useAnimal } from '../features/avatar/useAnimal'
import { EventBar } from '../features/game/EventBar'

/** 換裝：一排 ≥44 px 的選項，目前穿的用 aria-pressed 標示 */
function OutfitCard() {
  const inv = useInventory()
  const cfg = useGameConfig()
  const ownedOutfits = cfg.shop.filter((i) => i.kind === 'outfit' && inv.owned.includes(i.id))
  const ownedFrames = cfg.shop.filter((i) => i.kind === 'frame' && inv.owned.includes(i.id))
  if (ownedOutfits.length === 0 && ownedFrames.length === 0) return null
  const pick = (kind: 'outfit' | 'frame', current: string | undefined, id: string | undefined, label: string) => (
    <button
      key={id ?? 'none'}
      type="button"
      className={`chip me-chip ${current === id ? 'on' : ''}`}
      aria-pressed={current === id}
      onClick={() => equip(kind, id)}
    >
      {label}
    </button>
  )
  return (
    <Card>
      <h2>換裝</h2>
      <div className="chips me-chips" role="group" aria-label="小芽的造型">
        {pick('outfit', inv.equipped.outfit, undefined, '不穿戴')}
        {ownedOutfits.map((i) => pick('outfit', inv.equipped.outfit, i.id, i.name))}
      </div>
      {ownedFrames.length > 0 && (
        <div className="chips me-chips" role="group" aria-label="樹的頁面相框">
          {pick('frame', inv.equipped.frame, undefined, '無相框')}
          {ownedFrames.map((i) => pick('frame', inv.equipped.frame, i.id, i.name))}
        </div>
      )}
    </Card>
  )
}

export default function MePage() {
  const animal = useAnimal()
  return (
    <div className="page me-page">
      <TabHeader title="我的" />
      <p className="muted small">
        <MockTag title="光點、角色、徽章都存在你的裝置上，是示意功能" /> 小芽、光點與徽章是示意功能
      </p>
      <EventBar />

      <MeHero />
      <OutfitCard />
      <LedgerSection />
      <BadgesSection />
      <SettingsSection />

      <p className="me-closing" data-testid="me-closing">
        <Art id={animal.art} alt="" className="me-closing-art" />
        <span>光點只能在樹旁或幫城市得到，不能用錢買。沒有排行榜，也不用每天來，{animal.name}和小芽會在這裡等你。</span>
      </p>
    </div>
  )
}
