import { Link } from 'react-router-dom'
import { useBalance } from '../game/ledger'

/** 右上角的光點餘額，點了去商店 */
export function BalanceChip() {
  const balance = useBalance()
  return (
    <Link className="balance-pill" to="/shop" aria-label={`光點 ${balance}，前往商店`} data-testid="balance-chip">
      <span aria-hidden>✦</span> {balance} 光點
    </Link>
  )
}
