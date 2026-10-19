import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { findTree, type Tree } from '../lib/trees'
import { seededInt, weekKey } from '../lib/seed'
import type { CheckinResult } from '../lib/geo'
import { useSession } from '../store'
import { addWhisper, recentCheckin, useStore, visitedThisWeek, whispersOf } from '../store'
import { Art, MockTag, formatDate, relativeDays } from '../components/ui'
import { IconBack } from '../components/icons'
import type { CheckinState } from './ScanPage'
import { ReportBox } from '../features/report/ReportBox'
import { award, isDaytime } from '../features/game/ledger'
import { useInventory } from '../features/game/inventory'
import { NoticeCard } from '../features/notice/NoticeCard'
import { noticeFor } from '../features/notice/notices'

export default function TreePage() {
  const { treeId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fresh = (location.state as CheckinState | null)?.checkin
  // 從樹洞或圖鑑點進來，返回就回到那一頁；其他（掃碼、地圖）回地圖
  const fromTab = (location.state as { from?: string } | null)?.from
  const back = fromTab === '/journal' ? { to: '/journal', label: '樹洞' } : { to: '/', label: '地圖' }
  // 從地圖行動圈來、人在感應圈內：還沒打卡就提醒「掃一下樹牌就好」，不要再叫人走過去
  const nearTree = (location.state as { nearTree?: boolean } | null)?.nearTree === true
  const night = !isDaytime()
  const frame = useInventory().equipped.frame
  const [tree, setTree] = useState<Tree | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    findTree(treeId).then((t) => alive && setTree(t))
    return () => {
      alive = false
    }
  }, [treeId])

  // 從地圖的行動圈來：/tree/:id#whisper、#report 捲到對應的區塊（樹資料載入後才有區塊）
  const hash = location.hash.slice(1)
  const loaded = !!tree
  useEffect(() => {
    if (!hash || !loaded) return
    const target = document.getElementById(hash)
    if (!target) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [hash, loaded])

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
      </header>

      {/* 打卡的結果和樹放在一起，是這一頁唯一的主角 */}
      <section className={`hero-wrap ${frame ? `frame ${frame}` : ''} ${onSite ? 'met' : ''}`} aria-label="這棵樹">
        <Art id={night ? 'tree-hero-night' : 'tree-hero'} alt={`${tree.species}的插畫`} className="hero" />
        <CheckinStrip fresh={fresh} onSite={onSite} />
      </section>
      {night && <p className="night-note">夜裡，樹木休息中・沒有日照加成・回家路上注意安全</p>}

      {noticeFor(treeId) && <NoticeCard notice={noticeFor(treeId)!} />}

      <div className="glow-line">
        <Art id="glow" alt="" className="icon sm" />
        <span className="glow-sentence">
          這棵樹本週有 <strong>{glow}</strong> 道微光陪伴
        </span>
        <MockTag />
        <GlowHelp />
      </div>

      {capsule && !capsule.mock && (
        <section className="capsule" aria-label="時空膠囊">
          <Art id="capsule" alt="" className="icon" />
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
          <WhisperBox treeId={treeId} said={thisVisit.map((w) => w.text)} />
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
          <Art id="capsule" alt="" className="icon" />
          <div>
            <p className="capsule-when">
              {capsule.mock ? '示範：一年後回到這棵樹，會看到當時說的話' : `上次你在這裡說了…… ${relativeDays(capsule.at)}`}
              <span className="muted">（{formatDate(capsule.at)}）</span>
            </p>
            <p className="capsule-text">「{capsule.text}」</p>
          </div>
        </section>
      )}

      <details className="about">
        <summary>
          關於這棵樹 <span className="muted small">樹種、樹高、樹籍編號</span>
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
      </details>

      <div id="report" className="anchor-target">
        <ReportBox tree={tree} onSite={!!onSite} />
      </div>
    </div>
  )
}

/** 「微光是什麼？」 */
function GlowHelp() {
  return (
    <details className="inline-help">
      <summary aria-label="微光是什麼？">?</summary>
      <span>
        每個在這棵樹旁打卡的人，就是一道微光。只顯示人數，不會顯示任何人說了什麼。
      </span>
    </details>
  )
}

function CheckinStrip({
  fresh,
  onSite,
}: {
  fresh?: CheckinResult
  onSite: string | null
}) {
  if (onSite)
    return (
      <div className="checkin-strip ok" role="status">
        <strong>{onSite === 'success' ? '你在這棵樹旁邊。' : '遠遠陪著它。'}</strong>
        {onSite === 'farView' && <span>這棵樹在安全島上，在人行道看著它就好。</span>}
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

function WhisperBox({ treeId, said }: { treeId: string; said: string[] }) {
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
