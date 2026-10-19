import { useEffect, type RefObject } from 'react'
import { useUserReady } from '../../store'
import { onboarding, patchOnboarding, type Onboarding } from '../game/onboarding'

/**
 * 使用者看過某個畫面就記一次旗標（只在還沒記過、使用者文件已載入時寫，不會迴圈）。
 * 有 ref 就等那一塊真的出現在畫面上（IntersectionObserver）；沒有 ref 或瀏覽器不支援就在載入時記。
 */
export function useViewedFlag(key: 'viewedCodexAt' | 'viewedBadgesAt', ref?: RefObject<Element | null>) {
  const ready = useUserReady()
  useEffect(() => {
    if (!ready || onboarding()[key]) return
    const mark = () => {
      if (!onboarding()[key]) patchOnboarding({ [key]: Date.now() } as Partial<Onboarding>)
    }
    const node = ref?.current
    if (!node || typeof IntersectionObserver === 'undefined') return mark()
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        mark()
        io.disconnect()
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [ready, key, ref])
}
