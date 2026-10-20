import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { findTree, type Tree } from '../lib/trees'
import { seededInt, weekKey } from '../lib/seed'
import type { CheckinResult } from '../lib/geo'
import { useSession } from '../store'
import { addWhisper, recentCheckin, useStore, visitedThisWeek, whispersOf } from '../store'
import { Art, MockTag, formatDate, relativeDays } from '../components/ui'
import { IconBack, IconCapsule, IconGlow } from '../components/icons'
import type { CheckinState } from './ScanPage'
import { ReportBox } from '../features/report/ReportBox'
import { award, isDaytime } from '../features/game/ledger'
import { useIsProtectedTree } from '../features/game/protectedTrees'
import { checkinPointsLine } from '../features/game/checkinLine'
import { gameConfig } from '../features/game/config'
import { useInventory } from '../features/game/inventory'
import { NoticeCard } from '../features/notice/NoticeCard'
import { noticeFor } from '../features/notice/notices'
import { DropCards } from '../features/game/DropCards'
import { InteractionMood } from '../features/journal/InteractionMood'
import { useCelebrationBlocking } from '../features/onboarding/celebrationGate'
import { PhotoCarousel } from '../features/species/PhotoCarousel'
import { photoIndexForTree } from '../features/species/carousel'
import { useSpeciesPhotos } from '../lib/speciesPhotos'

export default function TreePage() {
  const { treeId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fresh = (location.state as CheckinState | null)?.checkin
  const drops = (location.state as CheckinState | null)?.drops
  const askMoodState = (location.state as CheckinState | null)?.askMood === true
  const glowState = (location.state as CheckinState | null)?.glow
  // 從某個分頁點進來（樹洞、我的光點紀錄、探索、集章冊），返回就回到那一頁；其他（掃碼、地圖）回地圖
  const fromTab = (location.state as { from?: string } | null)?.from
  const back = backTarget(fromTab)
  // 從地圖行動圈來、人在感應圈內：還沒打卡就提醒「掃一下樹牌就好」，不要再叫人走過去
  const nearTree = (location.state as { nearTree?: boolean } | null)?.nearTree === true
  const night = !isDaytime()
  const frame = useInventory().equipped.frame
  const [tree, setTree] = useState<Tree | null | undefined>(undefined)
  const photos = useSpeciesPhotos(tree?.species)
  const isProtected = useIsProtectedTree(treeId)
  const [sealOpen, setSealOpen] = useState(false)
  const sealNoteId = useId()

  // 剛打卡完的光點說明（2026-10-20 使用者決定）：只在這次打卡後顯示。記在 state 裡之後，把路由 state 的 glow 清掉，
  // 所以重新整理、返回再進來都不會再出現（其他欄位照舊保留）。
  const [freshGlow, setFreshGlow] = useState<{ treeId: string; glow: number } | null>(null)
  useEffect(() => {
    if (glowState === undefined) return
    setFreshGlow({ treeId, glow: glowState })
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: { ...(location.state as object), glow: undefined } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glowState, treeId])

  useEffect(() => {
    let alive = true
    findTree(treeId).then((t) => alive && setTree(t))
    return () => {
      alive = false
    }
  }, [treeId])

  // 從地圖的行動圈、掃描頁來：/tree/:id#whisper、#report 捲到對應的區塊（樹資料載入後才有區塊）。
  // 樹況回報收在「關於這棵樹」裡（頁面最後是樹洞與時空膠囊，不是行政卡片）：#report 要先把那一摺打開，再捲過去。
  const hash = location.hash.slice(1)
  const loaded = !!tree
  const [aboutOpen, setAboutOpen] = useState(hash === 'report')
  const scrolledTo = useRef('')
  useEffect(() => {
    if (hash === 'report') setAboutOpen(true)
  }, [hash, treeId])
  useEffect(() => {
    if (!hash || !loaded) return
    if (hash === 'report' && !aboutOpen) return
    if (scrolledTo.current === `${treeId}#${hash}`) return
    const target = document.getElementById(hash)
    if (!target) return
    scrolledTo.current = `${treeId}#${hash}`
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [hash, loaded, aboutOpen, treeId])

  const checkins = useStore((s) => s.checkins)
  const myWhispers = useStore((s) => s.whispers[treeId])
  const recent = useMemo(() => recentCheckin(treeId), [treeId, checkins])
  const onSite: CheckinResult['kind'] | null =
    fresh?.kind === 'success' || fresh?.kind === 'farView' ? fresh.kind : recent?.result ?? null
  const sessionStart = recent?.at ?? Date.now()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const whispers = useMemo(() => whispersOf(treeId), [treeId, myWhispers])
  const capsule = onSite ? whispers.find((w) => w.at < sessionStart) : undefined
  const thisVisit = whispers.filter((w) => w.at >= sessionStart && !w.mock)
  // 跟樹互動時的心情（2026-10-21）：打卡是預設的那一次互動，剛掃完就展開「現在的心情？」，其他時候縮成一行。
  // 有慶祝視窗開著時先不出現，等它關掉。樹洞的心情在樹洞卡裡（每一句話各自一個）。
  const celebrating = useCelebrationBlocking()
  const checkinMood =
    onSite && recent && !celebrating ? <InteractionMood kind="checkin" treeId={treeId} at={recent.at} open={askMoodState} /> : null
  const lastWhisperAt = thisVisit.length ? thisVisit[thisVisit.length - 1].at : null
  const glow = seededInt(`${treeId}:${weekKey()}`, 0, 30) + (visitedThisWeek(treeId) ? 1 : 0)

  if (tree === undefined) return <div className="page center muted">正在找這棵樹…</div>
  if (tree === null)
    return (
      <div className="page center">
        <p>資料裡還沒有這棵樹（{treeId}）。</p>
        <Link className="btn" to="/">
          回地圖
        </Link>
      </div>
    )

  return (
    <div className="page tree-page">
      <header className="topbar">
        <button className="btn ghost back" onClick={() => navigate(back.to)}>
          <IconBack /> {back.label}
        </button>
        <h1 className="topbar-title">{tree.species}</h1>
        {isProtected && <ProtectedSeal open={sealOpen} onToggle={() => setSealOpen(!sealOpen)} noteId={sealNoteId} />}
      </header>
      {isProtected && sealOpen && (
        <div id={sealNoteId} className="protected-note" data-testid="protected-note">
          <p>
            這是臺北市「受保護樹木」名冊裡的老樹，在它旁邊打卡，基礎光點是 {gameConfig().protectedBase}。
          </p>
          <p className="muted small">
            來源：臺北市政府文化局「臺北市受保護樹木」開放資料，依位置與樹種比對到這棵樹；樹籍名冊比對，非官方認定。
          </p>
        </div>
      )}

      {/* 打卡的結果和樹放在一起，是這一頁唯一的主角 */}
      <section className={`hero-wrap ${frame ? `frame ${frame}` : ''} ${onSite ? 'met' : ''} ${photos.length ? 'photos' : ''}`} aria-label="這棵樹">
        {photos.length ? (
          <PhotoCarousel
            species={tree.species}
            photos={[photos[photoIndexForTree(tree.id, photos.length)]]}
            note="這個樹種的照片，不是這一棵樹。"
          />
        ) : (
          <Art id={night ? 'tree-hero-night' : 'tree-hero'} alt={`${tree.species}的插畫`} className="hero" />
        )}
        <CheckinStrip
          fresh={fresh}
          onSite={onSite}
          pointsLine={
            onSite && freshGlow?.treeId === treeId
              ? checkinPointsLine({ glow: freshGlow.glow, kind: onSite === 'farView' ? 'farView' : 'success', protectedTree: isProtected })
              : null
          }
        />
      </section>
      <DropCards drops={drops} />
      {checkinMood}
      {night && <p className="night-note">夜裡，樹木休息中・沒有日照加成・回家路上注意安全</p>}

      {noticeFor(treeId) && <NoticeCard notice={noticeFor(treeId)!} />}

      <GlowLine glow={glow} />

      {capsule && !capsule.mock && (
        <section className="capsule" aria-label="時空膠囊">
          <span className="ornament" aria-hidden>
            <IconCapsule />
          </span>
          <div>
            <p className="capsule-when">
              {capsule.mock ? '示範：一年後回到這棵樹，會看到當時說的話' : `上次你在這裡說了…… ${relativeDays(capsule.at)}`}
              <span className="muted">（{formatDate(capsule.at)}）</span>
            </p>
            <p className="capsule-text">「{capsule.text}」</p>
          </div>
        </section>
      )}

      <div id="whisper" className="anchor-target">
        {onSite ? (
          <WhisperBox
            treeId={treeId}
            said={thisVisit.map((w) => w.text)}
            mood={(open) => (lastWhisperAt !== null ? <InteractionMood kind="whisper" treeId={treeId} at={lastWhisperAt} open={open} /> : null)}
          />
        ) : (
          <section className="card">
            <p>{nearTree ? '你已經在樹旁邊了。掃一下樹幹上的樹牌，就能對它說句話。' : '想對這棵樹說句話？走到樹旁邊，掃樹幹上的樹牌就可以。'}</p>
            <Link className="btn primary block" to="/scan" state={{ hintTreeId: treeId }}>
              掃樹牌
            </Link>
          </section>
        )}
      </div>

      {capsule && capsule.mock && (
        <section className="capsule" aria-label="時空膠囊">
          <span className="ornament" aria-hidden>
            <IconCapsule />
          </span>
          <div>
            <p className="capsule-when">
              {capsule.mock ? '示範：一年後回到這棵樹，會看到當時說的話' : `上次你在這裡說了…… ${relativeDays(capsule.at)}`}
              <span className="muted">（{formatDate(capsule.at)}）</span>
            </p>
            <p className="capsule-text">「{capsule.text}」</p>
          </div>
        </section>
      )}

      <details className="about" id="about" open={aboutOpen} onToggle={(e) => setAboutOpen(e.currentTarget.open)}>
        <summary>
          關於這棵樹 <span className="muted small">樹種、樹高、樹籍編號、樹況回報</span>
        </summary>
        <dl className="facts">
          <dt>樹種</dt>
          <dd>{tree.species}</dd>
          <dt>樹高</dt>
          <dd>{tree.height ?? '—'} 公尺</dd>
          <dt>胸徑</dt>
          <dd>{tree.diameter ?? '—'} 公分</dd>
          <dt>{tree.kind === 'park' ? '公園' : '路段'}</dt>
          <dd>
            {tree.district} {tree.place}
            {tree.remark && <span className="muted">（{tree.remark}）</span>}
          </dd>
          <dt>調查日期</dt>
          <dd>{tree.surveyDate || '—'}</dd>
          <dt>樹籍編號</dt>
          <dd className="num">{tree.id}</dd>
        </dl>
        <p className="muted small">資料來源：臺北市政府工務局公園路燈工程管理處開放資料</p>
        <div id="report" className="anchor-target">
          <ReportBox tree={tree} onSite={!!onSite} openForm={hash === 'report'} />
        </div>
      </details>
    </div>
  )
}

/**
 * 受保護樹木的印章：放在樹名旁邊，可以點（按鈕、至少 44 px 的點擊範圍），點開看說明與資料來源。
 * 印章本身（紅色手蓋的框）比點擊範圍小；說明在頁首下面，不開也不佔位置。
 */
function ProtectedSeal({ open, onToggle, noteId }: { open: boolean; onToggle: () => void; noteId: string }) {
  return (
    <button type="button" className="protected-tag" data-testid="protected-tag" aria-expanded={open} aria-controls={open ? noteId : undefined} onClick={onToggle}>
      <span className="seal">受保護樹木</span>
      <span className="visually-hidden">{open ? '，收起說明' : '，看說明'}</span>
    </button>
  )
}

/** 本週微光人數；「?」是 44 px 的按鈕，和句子同一行（句子太長可以折行），說明展開在下面整列 */
function GlowLine({ glow }: { glow: number }) {
  const [open, setOpen] = useState(false)
  const helpId = useId()
  return (
    <div className="glow-line">
      <span className="ornament sm glow" aria-hidden>
        <IconGlow />
      </span>
      <span className="glow-sentence">
        這棵樹本週有 <strong>{glow}</strong> 道微光陪伴
      </span>
      <MockTag />
      <button type="button" className="help-btn" aria-label="微光是什麼？" aria-expanded={open} aria-controls={helpId} onClick={() => setOpen(!open)}>
        <span className="help-dot" aria-hidden>
          ?
        </span>
      </button>
      {open && (
        <p id={helpId} className="glow-help muted small">
          每個在這棵樹旁打卡的人，就是一道微光。只顯示人數，不會顯示任何人說了什麼。
        </p>
      )}
    </div>
  )
}

function CheckinStrip({
  fresh,
  onSite,
  pointsLine,
}: {
  fresh?: CheckinResult
  onSite: string | null
  pointsLine: string | null
}) {
  if (onSite)
    return (
      <div className="checkin-strip ok" role="status">
        <strong>{onSite === 'success' ? '你在這棵樹旁邊。' : '遠遠陪著它。'}</strong>
        {onSite === 'farView' && <span>這棵樹在安全島上，在人行道看著它就好。</span>}
        {pointsLine && (
          <span className="checkin-points" data-testid="checkin-points">
            {pointsLine}
          </span>
        )}
      </div>
    )
  if (fresh?.kind === 'tooFar')
    return (
      <div className="checkin-strip warn" role="status">
        <strong>你離這棵樹約 {Math.round(fresh.distance)} 公尺。</strong>
        <span>
          走近一點再<Link to="/scan">掃一次</Link>，就能留話給它。
        </span>
      </div>
    )
  if (fresh?.kind === 'noLocation')
    return (
      <div className="checkin-strip warn" role="status">
        <strong>沒有你的位置，這次不算打卡。</strong>
        <span>允許定位後再掃一次；資料還是可以先看。</span>
      </div>
    )
  return (
    <div className="checkin-strip">
      <span>從地圖點進來，只能看。要留話，請到樹旁掃樹牌。</span>
    </div>
  )
}

/** mood：留完話之後那一句的心情（剛說完展開，之後縮成一行） */
function WhisperBox({ treeId, said, mood }: { treeId: string; said: string[]; mood: (open: boolean) => ReactNode }) {
  const cloud = useSession().backend === 'cloud'
  const [text, setText] = useState('')
  const [writing, setWriting] = useState(said.length === 0)
  const [justSaid, setJustSaid] = useState<string | null>(null)
  const last = justSaid ?? said[said.length - 1]

  if (!writing && last)
    return (
      <section className="whisper received" aria-live="polite">
        <p className={`whisper-sent ${justSaid ? 'drift' : ''}`}>「{last}」</p>
        <p className="whisper-ack">樹收到了。</p>
        <p className="muted small">
          {cloud ? '其他人看不到。存在曦語的雲端，不公開。下次回來，它會記得。' : '只有你看得到，不會上傳。下次回來，它會記得。'}
        </p>
        <button
          className="btn ghost again"
          onClick={() => {
            setJustSaid(null)
            setWriting(true)
          }}
        >
          再說一句
        </button>
        <div className="whisper-mood">{mood(!!justSaid)}</div>
      </section>
    )

  return (
    <section className="whisper" aria-labelledby="whisper-title">
      <h2 id="whisper-title">樹洞</h2>
      <p className="muted small">{cloud ? '其他人看不到。存在曦語的雲端，不公開。' : '只有你看得到。不會上傳，也不公開。'}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          addWhisper(treeId, text)
          award('whisper', treeId)
          setJustSaid(text.trim().slice(0, 140))
          setText('')
          setWriting(false)
        }}
      >
        <textarea
          className="input"
          value={text}
          maxLength={140}
          rows={3}
          placeholder="對這棵樹說一句話"
          onChange={(e) => setText(e.target.value)}
          aria-label="對這棵樹說一句話"
        />
        <div className="row between center-v">
          <span className="muted small">{text.length} / 140</span>
          <button className="btn primary" disabled={!text.trim()}>
            留在樹洞
          </button>
        </div>
      </form>
    </section>
  )
}

const BACK_LABEL: Record<string, string> = { '/journal': '樹洞', '/me': '我的', '/stamps': '集章冊', '/stamps?tab=explore': '探索' }

/** 樹的頁面的返回鍵：記得從哪個分頁來 */
export function backTarget(from: string | undefined): { to: string; label: string } {
  return from && BACK_LABEL[from] ? { to: from, label: BACK_LABEL[from] } : { to: '/', label: '地圖' }
}
