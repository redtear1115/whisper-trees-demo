import { useState } from 'react'
import { Card, MockTag } from '../../components/ui'
import { addOpinion, useMyOpinions, type Notice } from './notices'

/** 樹的頁面上的移樹前公告 */
export function NoticeCard({ notice }: { notice: Notice }) {
  const mine = useMyOpinions()[notice.id]
  const [text, setText] = useState('')
  return (
    <Card className="notice">
      <h2>
        移樹前公告 <MockTag />
      </h2>
      <p>
        這棵{notice.species}預計在 <strong>{notice.date}</strong> {notice.action}。
      </p>
      <p className="small">原因：{notice.reason}</p>
      <p className="muted small">已有 {notice.opinions + (mine ? 1 : 0)} 則意見。公告期間可以留一句話給公園處。</p>
      {mine ? (
        <p className="whisper-said">你的意見：「{mine}」</p>
      ) : (
        <form
          className="notice-form"
          onSubmit={(e) => {
            e.preventDefault()
            addOpinion(notice.id, text)
          }}
        >
          <input
            className="input"
            value={text}
            maxLength={140}
            placeholder="例如：這棵樹是公車站唯一的樹蔭"
            aria-label="對這次移樹的意見"
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn small primary" disabled={!text.trim()}>
            送出意見
          </button>
        </form>
      )}
    </Card>
  )
}
