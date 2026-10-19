import { useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { MockTag, formatDate, relativeDays } from '../components/ui'
import { useReports, useWishes, wishStatus } from '../store'
import { REPORT_KINDS } from '../store/types'
import { AdminMode, useCanSeeNotes } from '../features/cloud/AdminMode'
import { advance, STAGE_LABEL, stageOf, useOrders, type OrderStage } from '../features/vendor/orders'

const NEXT: Partial<Record<OrderStage, { to: OrderStage; label: string }>> = {
  new: { to: 'accepted', label: '接單' },
  accepted: { to: 'working', label: '開始施工' },
  working: { to: 'done', label: '完工回報' },
}

export default function VendorPage() {
  const wishes = useWishes()
  const reports = useReports()
  const orders = useOrders()
  const canSeeNotes = useCanSeeNotes()
  const [tab, setTab] = useState<'plant' | 'care'>('plant')

  // 政府端排程的案件，以及廠商已經完工的
  const plant = wishes.filter((w) => wishStatus(w) === 'scheduled' || orders[`wish:${w.id}`])
  const care = reports

  return (
    <div className="console">
      <header className="gov-head">
        <div>
          <h1>發包商後台</h1>
          <AdminMode role="植栽養護廠商視角" />
        </div>
        <AdminNav />
      </header>

      <div className="row gap">
        <button className={`chip ${tab === 'plant' ? 'on' : ''}`} onClick={() => setTab('plant')}>
          補種工單（{plant.length}）
        </button>
        <button className={`chip ${tab === 'care' ? 'on' : ''}`} onClick={() => setTab('care')}>
          養護工單（{care.length}）
        </button>
      </div>

      {tab === 'plant' && (
        <section>
          <h2>
            補種工單 <MockTag title="來自政府端「可種・已排程」的案件" />
          </h2>
          <p className="muted small">政府端把案件改成「可種・已排程」就會出現在這裡；完工回報後，市民端顯示「已種植」。</p>
          {plant.length === 0 && <p className="muted">目前沒有排程的補種案件。</p>}
          {plant.map((w) => (
            <Order
              key={w.id}
              id={`wish:${w.id}`}
              wishId={w.id}
              title={`${w.district} ${w.road}`}
              detail={`候選空樹穴 ${w.pitId ?? '（需會勘）'}・市民原因：${w.reasons.join('、')}`}
              stage={stageOf(`wish:${w.id}`, orders)}
              at={orders[`wish:${w.id}`]?.at}
              doneNote={orders[`wish:${w.id}`]?.note}
            />
          ))}
        </section>
      )}

      {tab === 'care' && (
        <section>
          <h2>
            養護工單 <MockTag title="來自市民的樹況回報（含示範資料）" />
          </h2>
          {!canSeeNotes && <p className="muted small">備註只有承辦人看得到。</p>}
          {care.map((r) => (
            <Order
              key={r.id}
              id={`report:${r.id}`}
              title={`${r.district} ${r.road}・${r.species}（${r.treeId}）`}
              detail={`${REPORT_KINDS[r.kind].label}：${r.details.join('、') || '未選細項'}${r.note && (canSeeNotes || r.mock || r.mine) ? `。「${r.note}」` : ''}・${relativeDays(r.at)}回報`}
              stage={stageOf(`report:${r.id}`, orders)}
              at={orders[`report:${r.id}`]?.at}
              doneNote={orders[`report:${r.id}`]?.note}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function Order({
  id,
  wishId,
  title,
  detail,
  stage,
  at,
  doneNote,
}: {
  id: string
  wishId?: string
  title: string
  detail: string
  stage: OrderStage
  at?: number
  doneNote?: string
}) {
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const next = NEXT[stage]
  return (
    <div className="order">
      <div className="row between center-v" style={{ gap: 8, flexWrap: 'wrap' }}>
        <strong>{title}</strong>
        <span className={`status-pill ${stage === 'done' ? 's-planted' : stage === 'new' ? 's-received' : 's-scheduled'}`}>
          {STAGE_LABEL[stage]}
        </span>
      </div>
      <p className="small">{detail}</p>
      {at && <p className="muted small">更新：{formatDate(at)}</p>}
      {stage === 'done' && doneNote && <p className="small">完工說明：{doneNote}</p>}
      {stage === 'working' && (
        <div className="form-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="完工說明（例：種下茄苳一棵，已立支架）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="完工說明"
          />
          <label className="btn small">
            {photo ? '換照片' : '附完工照片'}
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhoto(URL.createObjectURL(f))
              }}
            />
          </label>
        </div>
      )}
      {photo && <img className="report-photo" src={photo} alt="完工照片預覽（不上傳）" />}
      {next && (
        <button
          className="btn small primary"
          style={{ marginTop: 8 }}
          onClick={() => advance(id, next.to, { wishId, note: note.trim() || undefined, hasPhoto: !!photo })}
        >
          {next.label}
        </button>
      )}
    </div>
  )
}
