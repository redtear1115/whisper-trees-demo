import { Link } from 'react-router-dom'
import { useStore } from '../../store'
import { Card } from '../../components/ui'
import { firstLightEarned, onboarding, patchOnboarding, tasks } from '../game/onboarding'
import { useMemo } from 'react'

/** 集章冊「探索」裡的新手任務卡：拿到第一道光後出現，順序不拘，可以收合；全做完變成一行小字。 */
export function TasksCard() {
  const state = useStore((s) => s) // tasks() 每次回新陣列，不能直接當 selector（會無限重繪）
  const list = useMemo(() => tasks(state), [state])
  if (!firstLightEarned(state)) return null
  const doneCount = list.filter((t) => t.done).length
  if (doneCount === list.length) {
    return (
      <p className="muted small tasks-done" data-testid="tasks-card-done">
        新手任務都完成了，謝謝你認識這座城市。
      </p>
    )
  }
  const collapsed = !!onboarding(state).tasksCollapsed
  return (
    <Card>
      <div className="tasks-head">
        <h2>
          新手任務 <span className="muted small" data-testid="tasks-count">{doneCount} / {list.length}</span>
        </h2>
        <button
          className="btn small ghost"
          data-testid="tasks-toggle"
          aria-expanded={!collapsed}
          aria-controls="tasks-list"
          onClick={() => patchOnboarding({ tasksCollapsed: !collapsed })}
        >
          {collapsed ? '展開' : '收合'}
        </button>
      </div>
      {!collapsed && (
        <ul id="tasks-list" className="tasks" data-testid="tasks-list">
          {list.map((t) => (
            <li key={t.id} data-testid={`task-${t.id}`} data-done={t.done}>
              <Link className="task-row" to={t.to}>
                <span className="task-mark" aria-hidden>{t.done ? '✓' : '○'}</span>
                <span className="task-text">
                  <span className="task-label">{t.label}</span>
                  <span className="sr-only">{t.done ? '（已完成）' : '（還沒做）'}</span>
                  {!t.done && t.hint && <span className="muted small task-hint">{t.hint}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small" style={{ margin: '8px 0 0' }}>順序不拘，想做再做。</p>
    </Card>
  )
}
