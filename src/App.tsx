import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isDemoMode } from './store'
import { MobileOnly } from './features/device/MobileOnly'
import { TabLayout } from './features/nav/TabLayout'
import { LEGACY_REDIRECTS } from './features/nav/redirects'
import { OnboardingEffects } from './features/onboarding/OnboardingEffects'
import { FallbackBanner, MigrationPrompt, WriteFailedToast } from './features/cloud/Banners'

const MapPage = lazy(() => import('./pages/MapPage'))
const ScanPage = lazy(() => import('./pages/ScanPage'))
const TreePage = lazy(() => import('./pages/TreePage'))
const MyWishesPage = lazy(() => import('./pages/MyWishesPage'))
const GovPage = lazy(() => import('./pages/GovPage'))
const MePage = lazy(() => import('./pages/MePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))
const DemoControlPage = lazy(() => import('./pages/DemoControlPage'))
const StampsPage = lazy(() => import('./pages/StampsPage'))
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
  // 每個頁面（市民端與各後台）頂端都有；點了到 Demo 切換台，不會離開 Demo。離開請到「我的 → 設定與其他 → Demo 工具」
  return (
    <Link className="demo-badge" to="/demo-control" aria-label="Demo 模式：打開切換台，切換市民端與各後台" data-testid="demo-badge">
      Demo 模式・切換 ›
    </Link>
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
          <Route path="/" element={<MobileOnly><TabLayout><MapPage /></TabLayout></MobileOnly>} />
          <Route path="/stamps" element={<MobileOnly><TabLayout><StampsPage /></TabLayout></MobileOnly>} />
          <Route path="/journal" element={<MobileOnly><TabLayout><JournalPage /></TabLayout></MobileOnly>} />
          <Route path="/me" element={<MobileOnly><TabLayout><MePage /></TabLayout></MobileOnly>} />
          <Route path="/scan" element={<MobileOnly><ScanPage /></MobileOnly>} />
          <Route path="/tree/:treeId" element={<MobileOnly><TreePage /></MobileOnly>} />
          <Route path="/wishes" element={<MobileOnly><MyWishesPage /></MobileOnly>} />
          <Route path="/shop" element={<MobileOnly><ShopPage /></MobileOnly>} />
          <Route path="/gov" element={<GovPage />} />
          <Route path="/gm" element={<GmPage />} />
          <Route path="/vendor" element={<VendorPage />} />
          <Route path="/developers" element={<DevelopersPage />} />
          <Route path="/demo-control" element={<DemoControlPage />} />
          {/* 舊連結 */}
          {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
