import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { isDemoMode } from './store'
import MorePage from './pages/MorePage'
import { MobileOnly } from './features/device/MobileOnly'
import { OnboardingEffects } from './features/onboarding/OnboardingEffects'
import { FallbackBanner, MigrationPrompt, WriteFailedToast } from './features/cloud/Banners'

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
  // 只是標示，不可點：避免 Demo 時誤觸離開。離開請到「更多 → Demo 工具」
  return (
    <p className="demo-badge" role="note">
      Demo・模擬定位
    </p>
  )
}

/** 頁面載入中：掃描頁先放黑底和取景框，不閃一下白畫面 */
function RouteFallback() {
  const { pathname } = useLocation()
  if (pathname.endsWith('/scan'))
    return (
      <div className="scanner" aria-busy="true">
        <div className="scanner-frame" aria-hidden />
        <p className="scanner-loading">正在打開相機…</p>
      </div>
    )
  return <div className="page center muted">載入中…</div>
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DemoBadge />
      <FallbackBanner />
      <MigrationPrompt />
      <WriteFailedToast />
      <OnboardingEffects />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MobileOnly><MapPage /></MobileOnly>} />
          <Route path="/scan" element={<MobileOnly><ScanPage /></MobileOnly>} />
          <Route path="/tree/:treeId" element={<MobileOnly><TreePage /></MobileOnly>} />
          <Route path="/wishes" element={<MobileOnly><MyWishesPage /></MobileOnly>} />
          <Route path="/gov" element={<GovPage />} />
          <Route path="/me" element={<MobileOnly><MePage /></MobileOnly>} />
          <Route path="/shop" element={<MobileOnly><ShopPage /></MobileOnly>} />
          <Route path="/codex" element={<MobileOnly><CodexPage /></MobileOnly>} />
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
