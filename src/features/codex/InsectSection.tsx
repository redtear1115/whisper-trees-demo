import { Link } from 'react-router-dom'
import { Art, MockTag, formatDate } from '../../components/ui'
import { INSECTS } from '../game/drops'
import { useInventory, type Inventory } from '../game/inventory'

/** 圖鑑的「樹上住戶」：三種昆蟲，遇見的寫第一次的日期與樹，還沒遇見的是虛線剪影。昆蟲彩蛋是模擬。 */
export function InsectSection() {
  return <InsectList insects={useInventory().insects ?? {}} />
}

export function InsectList({ insects }: { insects: NonNullable<Inventory['insects']> }) {
  const met = INSECTS.filter((i) => insects[i.id]).length
  return (
    <section id="insects" className="insects" aria-labelledby="insects-title" data-testid="insect-section">
      <h3 id="insects-title">
        樹上住戶 <MockTag title="樹上住戶是示範用的模擬彩蛋，不是真的觀察紀錄" />
      </h3>
      <p className="muted small">
        在樹旁打卡時，偶爾會有小住戶探出頭。{met === 0 ? '還沒有遇見，不用急。' : `遇見了 ${met} 位。`}
      </p>
      <div className="insect-row">
        {INSECTS.map((i) => {
          const seen = insects[i.id]
          return seen ? (
            <div key={i.id} className="insect-tile" data-testid="insect-seen">
              <Art id={i.art} alt="" />
              <strong>{i.name}</strong>
              <span className="small">第一次遇見</span>
              <span className="small nowrap">{formatDate(seen.at)}</span>
              <Link to={`/tree/${seen.treeId}`} state={{ from: '/stamps?tab=explore' }} aria-label={`看這棵樹：${i.name}，${seen.treeId}`}>
                看這棵樹 ›
              </Link>
            </div>
          ) : (
            <div key={i.id} className="insect-tile unseen" data-testid="insect-unseen">
              <Art id={i.art} alt="" />
              <strong>{i.name}</strong>
              <span className="small">還沒遇見</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
