import { TabHeader } from '../features/nav/TabLayout'
import { TasksCard } from '../features/onboarding/TasksCard'
import { CodexSection } from '../features/codex/CodexSection'

/** 探索：上面留給迷霧地圖，下面是新手任務與樹的圖鑑 */
export default function ExplorePage() {
  return (
    <div className="page">
      <TabHeader title="探索" />

      <section aria-labelledby="fog-title">
        <h2 className="section-title" id="fog-title">
          探索地圖
        </h2>
        <div data-testid="fog-slot" className="fog-slot">
          <p className="muted small">（迷霧地圖即將放在這裡）</p>
        </div>
      </section>

      <TasksCard />
      <CodexSection />
    </div>
  )
}
