import { Link } from 'react-router-dom'
import { Art, MockTag } from '../../components/ui'
import type { CheckinDrops } from './drops'

/** 打卡之後的小驚喜：稀有配件與樹上住戶。安靜地出現，沒有倒數、沒有催促。緊湊的小列：小圖示、一句話、一行小字加連結，讓樹洞卡早一點出現。 */
export function DropCards({ drops }: { drops?: CheckinDrops }) {
  if (!drops?.hat && !drops?.insect) return null
  return (
    <div className="drop-cards" data-testid="drop-cards">
      {drops.hat && (
        <section className="drop-card rare" role="status" aria-label="稀有配件" data-testid="drop-hat">
          <Art id="item-hat-ancient" alt="古木紋理頭飾" className="drop-art" />
          <div>
            <p className="drop-line">這棵受保護的老樹送你一件古木紋理頭飾。</p>
            <p className="drop-sub small">
              <span className="muted">稀有・受保護樹木，每人一件。</span>
              <Link className="drop-link" to="/me">
                去「我的」戴上它 ›
              </Link>
            </p>
          </div>
        </section>
      )}
      {drops.insect && (
        <section className="drop-card" role="status" aria-label="樹上住戶" data-testid="drop-insect">
          <Art id={drops.insect.art} alt={drops.insect.name} className="drop-art" />
          <div>
            <p className="drop-line">
              {drops.insect.line}。<MockTag title="樹上住戶是示範用的模擬彩蛋，不是真的觀察紀錄" />
            </p>
            <p className="drop-sub small">
              <span className="muted">
                {drops.insect.bonus > 0 ? `多收進 ${drops.insect.bonus} 道光點，` : ''}
                已收進圖鑑。
              </span>
              <Link className="drop-link" to="/stamps?tab=explore#insects">
                看圖鑑 ›
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
