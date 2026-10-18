import { dayKey } from '../../lib/seed'
import { activeEvent, useGameConfig } from './config'

/** GM 設定的活動進行中時顯示 */
export function EventBar() {
  const cfg = useGameConfig()
  const event = activeEvent(cfg, dayKey())
  if (!event) return null
  return (
    <p className="event-bar" role="status">
      {event.name}：光點 ×{event.multiplier}（到 {event.end}）
    </p>
  )
}
