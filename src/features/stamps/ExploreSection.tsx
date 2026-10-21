import { TasksCard } from '../onboarding/TasksCard'
import { CodexSection } from '../codex/CodexSection'
import { FogMap } from '../fog/FogMap'

/** 集章冊裡的「探索」：迷霧地圖（打卡過的樹周圍散開）、新手任務、樹的圖鑑 */
export function ExploreSection() {
  return (
    <>
      <section aria-labelledby="fog-title">
        <h2 className="section-title" id="fog-title">
          探索地圖
        </h2>
        <div data-testid="fog-slot" className="fog-slot">
          <FogMap height={320} />
        </div>
      </section>

      <TasksCard />
      <CodexSection />
    </>
  )
}
