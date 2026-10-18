import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { exitDemoMode, isDemoMode } from './store'
import MorePage from './pages/MorePage'

const MapPage = lazy(() => import('./pages/MapPage'))
const ScanPage = lazy(() => import('./pages/ScanPage'))
const TreePage = lazy(() => import('./pages/TreePage'))
const MyWishesPage = lazy(() => import('./pages/MyWishesPage'))
const GovPage = lazy(() => import('./pages/GovPage'))

function DemoBadge() {
  if (!isDemoMode()) return null
  return (
    <button
      className="demo-badge"
      title="點一下離開 Demo 模式"
      onClick={() => {
        exitDemoMode()
        location.href = location.pathname
      }}
    >
      Demo 模式：模擬定位
    </button>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DemoBadge />
      <Suspense fallback={<div className="page center muted">載入中…</div>}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/tree/:treeId" element={<TreePage />} />
          <Route path="/wishes" element={<MyWishesPage />} />
          <Route path="/gov" element={<GovPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<MorePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
