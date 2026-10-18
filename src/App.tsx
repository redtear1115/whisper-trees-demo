import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { exitDemoMode, isDemoMode } from './store'
import MorePage from './pages/MorePage'

const MapPage = lazy(() => import('./pages/MapPage'))
const ScanPage = lazy(() => import('./pages/ScanPage'))
const TreePage = lazy(() => import('./pages/TreePage'))
const MyWishesPage = lazy(() => import('./pages/MyWishesPage'))
const GovPage = lazy(() => import('./pages/GovPage'))
const MePage = lazy(() => import('./pages/MePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const CodexPage = lazy(() => import('./pages/CodexPage'))
const GmPage = lazy(() => import('./pages/GmPage'))
const VendorPage = lazy(() => import('./pages/VendorPage'))
const DevelopersPage = lazy(() => import('./pages/DevelopersPage'))

function DemoBadge() {
  const demo = isDemoMode()
  // 頂端細條：讓出位置給它，不蓋住任何內容
  useEffect(() => {
    document.body.classList.toggle('is-demo', demo)
  }, [demo])
  if (!demo) return null
  return (
    <button
      className="demo-badge"
      title="點一下離開 Demo 模式"
      onClick={() => {
        exitDemoMode()
        location.href = location.pathname
      }}
    >
      Demo・模擬定位（點此離開）
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
          <Route path="/me" element={<MePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/codex" element={<CodexPage />} />
          <Route path="/gm" element={<GmPage />} />
          <Route path="/vendor" element={<VendorPage />} />
          <Route path="/developers" element={<DevelopersPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<MorePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
