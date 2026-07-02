import type { PlanRepository } from '../../repositories/plan-repository'
import { startWorkoutDef } from './definitions'

/**
 * `start_workout` validates the plan server-side and returns its id/name. The
 * actual timer is started on the client (see the assistant route), which
 * navigates to the workout page with this plan preselected.
 */
export function workoutTools(userId: string, repo: PlanRepository) {
  const startWorkout = startWorkoutDef.server(async ({ planId }) => {
    const plan = await repo.getById(planId, userId)
    if (!plan) return { ok: false, planId, error: `Plan "${planId}" was not found.` }
    if (plan.activities.length === 0) {
      return { ok: false, planId, name: plan.name, error: 'This plan has no activities to run.' }
    }
    return { ok: true, planId, name: plan.name }
  })

  return [startWorkout]
}
