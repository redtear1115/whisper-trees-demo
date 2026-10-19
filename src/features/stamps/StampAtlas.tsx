import { useEffect, useMemo, useState } from 'react'
import type { Checkin } from '../../store/types'
import { useOutline } from '../game/OutlineBackdrop'
import { PREFIX_DISTRICT, type District, type DistrictLedger, type DistrictStamps } from '../game/districts'
import { countLitByVillage, loadVillages, type DistrictVillages, type Village } from '../../lib/villages'
import { CityMap } from './CityMap'
import { DistrictCard } from './DistrictCard'
import { RouteView } from './RouteView'
import { VillageMap } from './VillageMap'
import { litTreeIds, litTreePoints, loadTreePoints, type TreePoint } from './villageTrees'

const PREFIX_OF = Object.fromEntries(Object.entries(PREFIX_DISTRICT).map(([p, d]) => [d, p])) as Record<District, string>

type Level = 'city' | 'district' | 'route'

interface Loaded {
  villages: DistrictVillages
  trees: TreePoint[]
}

/** 集章冊的地圖：全市（區）→ 里 → 路線，三層共用一條麵包屑。 */
export function StampAtlas({
  book,
  light,
  checkins,
}: {
  book: readonly DistrictStamps[]
  light: ReadonlyMap<District, DistrictLedger>
  checkins: readonly Checkin[]
}) {
  const outline = useOutline()
  const [level, setLevel] = useState<Level>('city')
  const [district, setDistrict] = useState<District | null>(null)
  const [village, setVillage] = useState<Village | null>(null)

  const b = district ? book.find((x) => x.district === district) : undefined
  const prefix = district ? PREFIX_OF[district] : null
  const inDistrict = level !== 'city' && prefix !== null

  const [data, setData] = useState<Loaded | 'failed' | null>(null)
  useEffect(() => {
    if (!inDistrict || !prefix) return
    let alive = true
    setData(null)
    Promise.all([loadVillages(prefix), loadTreePoints(prefix)]).then(([villages, trees]) => {
      if (alive) setData(villages && trees ? { villages, trees } : 'failed')
    })
    return () => {
      alive = false
    }
  }, [inDistrict, prefix])

  const lit = useMemo(() => (prefix ? litTreeIds(checkins, prefix) : new Set<string>()), [checkins, prefix])
  const litByVillage = useMemo(
    () => (data && data !== 'failed' ? countLitByVillage(litTreePoints(data.trees, lit), data.villages.villages) : new Map<string, number>()),
    [data, lit],
  )

  const goCity = () => {
    setLevel('city')
    setVillage(null)
  }
  const goDistrict = () => {
    setLevel('district')
    setVillage(null)
  }
  const pickVillage = (v: Village) => setVillage(v)

  const crumbs: { label: string; go?: () => void }[] = [{ label: '全市', go: level === 'city' ? undefined : goCity }]
  if (level !== 'city' && district) crumbs.push({ label: district, go: level === 'district' && !village ? undefined : goDistrict })
  if (village && level !== 'city') crumbs.push({ label: village.name, go: level === 'route' ? () => setLevel('district') : undefined })

  return (
    <div className="atlas" data-testid="atlas" data-level={level}>
      <nav className="atlas-crumbs" aria-label="地圖層級" data-testid="atlas-crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span aria-hidden="true"> › </span>}
            {c.go ? (
              <button type="button" onClick={c.go}>
                {c.label}
              </button>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {level === 'city' && (
        <>
          {outline ? (
            <CityMap outline={outline} book={book} picked={district} onPick={setDistrict} />
          ) : (
            <p className="atlas-note">正在載入地圖…</p>
          )}
          {b ? (
            <DistrictCard b={b} light={light.get(b.district)} onEnter={goDistrict} />
          ) : (
            <p className="muted small">點一區看進度與光點。顏色越亮，集到的章越高。</p>
          )}
          {outline && (
            <p className="muted small outline-credit" data-testid="outline-credit">
              行政區界：© OpenStreetMap contributors（ODbL）
            </p>
          )}
        </>
      )}

      {level !== 'city' && district && (
        <>
          {data === 'failed' && <p className="atlas-note" data-testid="village-failed">里的資料暫時載入失敗，晚點再試試看。</p>}
          {data === null && <p className="atlas-note" aria-live="polite">正在載入{district}的里…</p>}
          {data && data !== 'failed' && level === 'district' && (
            <>
              <VillageMap data={data.villages} lit={litByVillage} pickedId={village?.id ?? null} onPick={pickVillage} />
              {village ? (
                <VillageCard village={village} lit={litByVillage.get(village.id) ?? 0} onRoute={() => setLevel('route')} />
              ) : (
                <p className="muted small">點一個里看已點亮幾棵。每棵不同的樹打卡過就會點亮。</p>
              )}
              <p className="muted small outline-credit" data-testid="village-credit">
                {data.villages.attribution}
              </p>
            </>
          )}
          {data && data !== 'failed' && level === 'route' && village && prefix && (
            <section className="atlas-card" aria-label={`${village.name}的路線`}>
              <h2>{village.name}・規劃路線</h2>
              <RouteView prefix={prefix} village={village} lit={lit} />
              <button type="button" className="btn ghost block" onClick={() => setLevel('district')} data-testid="route-back">
                回{district}的里地圖
              </button>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function VillageCard({ village, lit, onRoute }: { village: Village; lit: number; onRoute: () => void }) {
  const none = village.total === 0
  const all = !none && lit >= village.total
  return (
    <section className="atlas-card" aria-label={`${village.name}`} data-testid="village-card" data-village={village.id}>
      <h2>{village.name}</h2>
      {none ? (
        <p data-testid="village-progress">這一里沒有樹木資料。</p>
      ) : (
        <>
          <p className="atlas-big" data-testid="village-progress">
            {village.name}：已點亮 <strong>{lit}</strong>／{village.total} 棵
          </p>
          <div className="bar" aria-hidden>
            <div style={{ width: `${Math.min(100, (lit / village.total) * 100)}%` }} />
          </div>
        </>
      )}
      <button type="button" className="btn primary block" onClick={onRoute} disabled={none || all} data-testid="plan-route">
        規劃路線
      </button>
      {all && <p className="muted small">這一里的樹都點亮了。</p>}
    </section>
  )
}
