import type { PlanRepository } from '../../repositories/plan-repository'
import type { WorkoutLogRepository } from '../../repositories/workout-log-repository'
import { planTools } from './plans'
import { workoutTools } from './workout'
import { loggingTools } from './logging'
import { videoTools } from './videos'
import type { VideoRepository } from '../../repositories/video-repository'

/**
 * Build the full tool set bound to the signed-in user. Called per request in the
 * chat server route with a freshly-resolved user id and repository. `logRepo`
 * and `videoRepo` are injectable for tests (in-memory DB); the route relies on
 * the defaults.
 */
export function buildTools(
  userId: string,
  repo: PlanRepository,
  logRepo?: WorkoutLogRepository,
  videoRepo?: VideoRepository,
) {
  return [
    ...planTools(userId, repo),
    ...workoutTools(userId, repo),
    ...loggingTools(userId, repo, logRepo),
    ...videoTools(userId, videoRepo),
  ]
}
