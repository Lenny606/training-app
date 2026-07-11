import type { PlanRepository } from '../../repositories/plan-repository'
import { planTools } from './plans'
import { workoutTools } from './workout'
import { loggingTools } from './logging'

/**
 * Build the full tool set bound to the signed-in user. Called per request in the
 * chat server route with a freshly-resolved user id and repository.
 */
export function buildTools(userId: string, repo: PlanRepository) {
  return [
    ...planTools(userId, repo),
    ...workoutTools(userId, repo),
    ...loggingTools(userId, repo),
  ]
}
