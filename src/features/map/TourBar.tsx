import type { ActiveTour } from '../../store'
import { tourBarText } from './tour'

/** 地圖頂端的小列：這條路線點亮了幾棵；「看全程」把鏡頭拉到看得到整條路線，「結束」收起路線 */
export function TourBar({ tour, done, onFit, onEnd }: { tour: ActiveTour; done: number; onFit: () => void; onEnd: () => void }) {
  const finished = done >= tour.stops.length
  return (
    <div className="tour-bar" data-testid="tour-bar" data-done={done} data-total={tour.stops.length} data-finished={finished || undefined} role="status">
      <p className="tour-bar-text" data-testid="tour-bar-text">
        {tourBarText(tour, done)}
      </p>
      <div className="tour-bar-actions">
        {!finished && (
          <button type="button" className="btn small ghost" onClick={onFit} data-testid="tour-fit">
            看全程
          </button>
        )}
        <button type="button" className="btn small" onClick={onEnd} data-testid="tour-end">
          結束
        </button>
      </div>
    </div>
  )
}
