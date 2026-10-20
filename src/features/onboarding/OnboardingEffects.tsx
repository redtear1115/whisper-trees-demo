import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Art } from '../../components/ui'
import { isDemoMode, useStore, useUserReady } from '../../store'
import { useAuth } from '../../lib/firebase'
import { firstLightEarned, grantStarterGift, newcomerDone, onboarding, patchOnboarding, shouldCelebrateNewcomer } from '../game/onboarding'
import { CelebrationDialog } from './Celebration'
import { firstLightCelebration, isStandalone, shouldRecordHomeScreen, STEP_CELEBRATE, tourView } from './tour'

/**
 * 整個 App 一份、不畫東西（除了慶祝視窗）的自動動作：
 * 1. 第一道光之後送新手禮（等使用者文件載入完成才寫）；引導沒停在第 3 步時（略過了、Demo 模式）跳一次慶祝視窗。
 * 2. 從手機桌面的圖示打開 → 記下 homeScreenAt 並慶祝「回家的路」。
 * 3. 4 項新手任務都完成 → 記下 newcomerCelebratedAt 並慶祝「城市的新朋友」一次。
 * 換 uid（例如用 Google 登入切換）或載入完成時都會重新檢查，所以 Google 帳號也會記到。
 */
export function OnboardingEffects() {
  const ready = useUserReady()
  const { uid } = useAuth()
  const firstLight = useStore((s) => firstLightEarned(s))
  const allDone = useStore((s) => newcomerDone(s))
  const tourOnCelebrate = useStore((s) => {
    const v = tourView({ ob: onboarding(s), firstLight: firstLightEarned(s), ready, demo: isDemoMode() })
    return v.open && v.step === STEP_CELEBRATE
  })
  const [firstLightDialog, setFirstLightDialog] = useState(false)
  const [homeCelebration, setHomeCelebration] = useState(false)
  const [newcomerCelebration, setNewcomerCelebration] = useState(false)

  useEffect(() => {
    if (ready && firstLight) grantStarterGift()
  }, [ready, firstLight, uid])

  useEffect(() => {
    const how = firstLightCelebration({ ready, firstLight, celebratedAt: onboarding().firstLightCelebratedAt, tourOnCelebrate })
    if (how === 'none') return
    patchOnboarding({ firstLightCelebratedAt: Date.now() })
    if (how === 'dialog') setFirstLightDialog(true)
  }, [ready, firstLight, tourOnCelebrate, uid])

  useEffect(() => {
    // 讀當下的值而不是 render 時的值：重複執行（StrictMode、換 uid）也不會記兩次
    if (shouldRecordHomeScreen({ standalone: isStandalone(), ready, homeScreenAt: onboarding().homeScreenAt })) {
      patchOnboarding({ homeScreenAt: Date.now() })
      setHomeCelebration(true)
    }
  }, [ready, uid])

  useEffect(() => {
    // 一樣讀當下的值，只慶祝一次
    if (shouldCelebrateNewcomer({ ready, done: allDone, celebratedAt: onboarding().newcomerCelebratedAt })) {
      patchOnboarding({ newcomerCelebratedAt: Date.now() })
      setNewcomerCelebration(true)
    }
  }, [ready, allDone, uid])

  if (firstLightDialog) {
    const close = () => setFirstLightDialog(false)
    return (
      <CelebrationDialog badgeId="first-light" onClose={close}>
        <div className="tour-gift">
          <Art id="item-hat-acorn" alt="橡實帽" />
          <p>
            <strong>新手禮：橡實帽</strong>
            <br />
            送你一頂，不花光點。<Link to="/me" onClick={close}>到小芽換上</Link>看看。
          </p>
        </div>
      </CelebrationDialog>
    )
  }
  if (!homeCelebration && newcomerCelebration) {
    return (
      <CelebrationDialog badgeId="newcomer" onClose={() => setNewcomerCelebration(false)}>
        <p className="small">新手任務都完成了。之後想做什麼，都隨你。</p>
      </CelebrationDialog>
    )
  }
  if (!homeCelebration) return null
  return (
    <CelebrationDialog badgeId="home-screen" onClose={() => setHomeCelebration(false)}>
      <p className="small">歡迎從桌面圖示回來。之後想找樹，直接點它就好。</p>
    </CelebrationDialog>
  )
}
