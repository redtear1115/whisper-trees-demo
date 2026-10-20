import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Checkin } from '../../store/types'
import type { Outline } from '../../lib/outline'
import { PREFIX_DISTRICT, type District, type DistrictLedger, type DistrictStamps } from '../game/districts'
import { countLitByVillage, loadVillages, type DistrictVillages, type Village } from '../../lib/villages'
import { CityMap } from './CityMap'
import { DistrictCard } from './DistrictCard'
import { RouteView } from './RouteView'
import { VillageList } from './VillageList'
import { VillageMap } from './VillageMap'
import { creditText } from './credit'
import { useReveal } from './reveal'
import { asDistrict, homeSummaryText, selectedDistrict, stampCountText, villageUntouched } from './home'
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
  homeDistrict,
  viewToggle,
  stampCount = 0,
  outline,
}: {
  book: readonly DistrictStamps[]
  light: ReadonlyMap<District, DistrictLedger>
  checkins: readonly Checkin[]
  /** 我的區（中文區名）：打開時就選好這一區、卡片可見；沒有就是空白的全市 */
  homeDistrict?: string
  /** 「地圖／依取得時間」切換鈕：放在地圖卡片的頂端（在地圖之前，讀屏先遇到它） */
  viewToggle?: ReactNode
  /** 已集到的章數：有「我的區」就併進那一行，沒有就放在切換鈕旁 */
  stampCount?: number
  /** 台北市輪廓與區界（由頁面載入並保留：切到「依取得時間」再切回來，地圖和切換鈕不會重新掛載、焦點不掉）；還沒載好是 null */
  outline: Outline | null
}) {
  const [level, setLevel] = useState<Level>('city')
  const [picked, setDistrict] = useState<District | null>(null)
  const district = selectedDistrict(picked, homeDistrict)
  const [village, setVillage] = useState<Village | null>(null)

  const home = asDistrict(homeDistrict)
  const homeBook = home ? book.find((x) => x.district === home) : undefined

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

  // 選了之後：下方的狀態卡捲進畫面、焦點移到卡片標題；另外用 aria-live 報一聲
  const [cityReveal, setCityReveal] = useState<string | null>(null)
  const [villageReveal, setVillageReveal] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const seq = useRef(0)
  // 「看我的區」把整張卡捲進頂端與導覽之間；點地圖只捲到看得到標題列（見 reveal.ts）
  const [cityFull, setCityFull] = useState(false)
  const cityCardRef = useReveal<HTMLDivElement>(cityReveal, '.atlas-panel', cityFull)
  const villageCardRef = useReveal<HTMLDivElement>(villageReveal)

  const pickDistrict = (d: District, full = false) => {
    setDistrict(d)
    setCityFull(full)
    setCityReveal(`${d}:${seq.current++}`)
    setAnnounce(`已選取${d}，詳細在下方的卡片。`)
  }

  const goCity = () => {
    setLevel('city')
    setVillage(null)
  }
  const goDistrict = () => {
    setLevel('district')
    setVillage(null)
  }
  const pickVillage = (v: Village) => {
    setVillage(v)
    setVillageReveal(`${v.id}:${seq.current++}`)
    setAnnounce(`已選取${v.name}，詳細在下方的卡片。`)
  }

  const countText = stampCountText(stampCount)
  const head = viewToggle ? (
    <div className="atlas-head" data-testid="atlas-head">
      {viewToggle}
      {!home && countText && (
        <span className="stamps-count">
          已集 <strong data-testid="stamp-count">{stampCount}</strong> 枚章
        </span>
      )}
    </div>
  ) : undefined

  const crumbs: { label: string; go?: () => void }[] = [{ label: '全市', go: level === 'city' ? undefined : goCity }]
  if (level !== 'city' && district) crumbs.push({ label: district, go: level === 'district' && !village ? undefined : goDistrict })
  if (village && level !== 'city') crumbs.push({ label: village.name, go: level === 'route' ? () => setLevel('district') : undefined })

  return (
    <div className="atlas" data-testid="atlas" data-level={level}>
      <p className="visually-hidden" role="status" aria-live="polite" data-testid="atlas-live">
        {announce}
      </p>
      {/* 全市層只有一段、不能點，不佔位置；進到里或路線才出現 */}
      <nav className="atlas-crumbs" aria-label="地圖層級" data-testid="atlas-crumbs" hidden={level === 'city'}>
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
          {home && homeBook && (
            <div className="atlas-home" data-testid="home-summary" data-district={home}>
              <p>
                {homeSummaryText(home, homeBook.distinct)}
                {countText && (
                  <span className="home-count">
                    <span className="visually-hidden">，</span>已集 <strong data-testid="stamp-count">{stampCount}</strong> 枚章
                  </span>
                )}
              </p>
              <button type="button" className="btn small" onClick={() => pickDistrict(home, true)} data-testid="home-jump">
                看我的區 <span aria-hidden="true">↓</span>
              </button>
            </div>
          )}
          {outline ? (
            <CityMap
              outline={outline}
              book={book}
              picked={district}
              head={head}
              onPick={(d) => pickDistrict(d)}
              onEnter={(d) => {
                setDistrict(d)
                goDistrict()
              }}
            />
          ) : (
            <>
              {head}
              <p className="atlas-note">正在載入地圖…</p>
            </>
          )}
          {b ? (
            <div ref={cityCardRef} className="atlas-reveal">
              <DistrictCard b={b} light={light.get(b.district)} onEnter={goDistrict} />
            </div>
          ) : (
            <p className="muted small">點一區看進度與光點，點兩下直接進里地圖。印得越深，集到的章越高。</p>
          )}
          {outline && (
            <p className="muted small atlas-credit" data-testid="outline-credit">
              {creditText('city')}
            </p>
          )}
        </>
      )}

      {level !== 'city' && district && (
        <>
          {(data === null || data === 'failed') && head}
          {data === 'failed' && <p className="atlas-note" data-testid="village-failed">里的資料暫時載入失敗，晚點再試試看。</p>}
          {data === null && <p className="atlas-note" aria-live="polite">正在載入{district}的里…</p>}
          {data && data !== 'failed' && level === 'district' && (
            <>
              <VillageMap data={data.villages} lit={litByVillage} pickedId={village?.id ?? null} onPick={pickVillage} head={head} />
              {village ? (
                <div ref={villageCardRef} className="atlas-reveal">
                  <VillageCard village={village} lit={litByVillage.get(village.id) ?? 0} onRoute={() => setLevel('route')} />
                </div>
              ) : (
                <p className="muted small">點一個里看已點亮幾棵，里太小就用下面的列表選。每棵不同的樹打卡過就會點亮。</p>
              )}
              <VillageList villages={data.villages.villages} lit={litByVillage} pickedId={village?.id ?? null} onPick={pickVillage} />
              <p className="muted small atlas-credit" data-testid="village-credit">
                {creditText('district')}
              </p>
            </>
          )}
          {data && data !== 'failed' && level === 'route' && village && prefix && (
            <>
            {head}
            <section className="atlas-card" aria-label={`${village.name}的路線`}>
              <h2>{village.name}・規劃路線</h2>
              <RouteView prefix={prefix} village={village} lit={lit} />
              <button type="button" className="btn ghost block" onClick={() => setLevel('district')} data-testid="route-back">
                回{district}的里地圖
              </button>
            </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

function VillageCard({ village, lit, onRoute }: { village: Village; lit: number; onRoute: () => void }) {
  const none = village.total === 0
  const all = !none && lit >= village.total
  const untouched = villageUntouched(village, lit)
  return (
    <section className="atlas-card" aria-label={`${village.name}`} data-testid="village-card" data-village={village.id}>
      <h2 tabIndex={-1} data-reveal-heading>
        {village.name}
      </h2>
      {none ? (
        <p data-testid="village-progress">這一里沒有樹木資料。</p>
      ) : untouched ? (
        <p data-testid="village-progress">
          這一里有 {village.total} 棵樹，走到任何一棵旁邊掃樹牌，就會點亮第一棵。
        </p>
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
