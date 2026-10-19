import { NavLink } from 'react-router-dom'

const LINKS = [
  ['/', '市民端'],
  ['/gov', '政府端'],
  ['/vendor', '發包商'],
  ['/gm', '遊戲營運'],
  ['/developers', '開放 API'],
] as const

/** 所有後台共用同一組導覽，目前所在頁面標示出來 */
export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="後台">
      {LINKS.map(([to, label]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `btn small ${isActive ? 'current' : ''}`}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
