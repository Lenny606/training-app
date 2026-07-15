import type { PlanRepository } from '../../repositories/plan-repository'
import type { WorkoutLogRepository } from '../../repositories/workout-log-repository'
import { planTools } from './plans'
import { workoutTools } from './workout'
import { loggingTools } from './logging'

/**
 * Build the full tool set bound to the signed-in user. Called per request in the
 * chat server route with a freshly-resolved user id and repository. `logRepo`
 * is injectable for tests (in-memory DB); the route relies on the default.
 */
export function buildTools(
  userId: string,
  repo: PlanRepository,
  logRepo?: WorkoutLogRepository,
) {
  return [
    ...planTools(userId, repo),
    ...workoutTools(userId, repo),
    ...loggingTools(userId, repo, logRepo),
  ]
}
