import type { Feasibility } from '../../lib/score'

export const FEASIBILITY_TEXT: Record<Feasibility, string> = {
  emptyPit: '空樹穴，容易種',
  wideSidewalk: '寬人行道，可評估',
  needsSurvey: '需會勘',
}
