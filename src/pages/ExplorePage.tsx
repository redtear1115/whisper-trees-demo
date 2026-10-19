import { TabHeader } from '../features/nav/TabLayout'
import { TasksCard } from '../features/onboarding/TasksCard'
import { CodexSection } from '../features/codex/CodexSection'
import { FogMap } from '../features/fog/FogMap'

/** 探索：上面是迷霧地圖（打卡過的樹周圍散開），下面是新手任務與樹的圖鑑 */
export default function ExplorePage() {
  return (
    <div className="page">
      <TabHeader title="探索" />

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
    </div>
  )
}
