import { DEFAULT_ACTIVITY_DURATION } from '../../domain/plans'
import type { NewActivity } from '../../domain/plans'
import type { PlanRepository } from '../../repositories/plan-repository'
import {
  PlanNotFoundError,
  PlanValidationError,
} from '../../repositories/plan-repository'
import {
  addActivityDef,
  createPlanDef,
  deletePlanDef,
  getPlanDef,
  listPlansDef,
  summarizePlanDef,
  updatePlanDef,
} from './definitions'

/** Tool input allows omitting duration (schema default) — the domain requires it. */
function withDefaultDuration<T extends { duration?: number }>(
  activity: T,
): T & { duration: number } {
  return { ...activity, duration: activity.duration ?? DEFAULT_ACTIVITY_DURATION }
}

/** Turn repository errors into a readable string for the model (never leak stacks). */
function errText(e: unknown): string {
  if (e instanceof PlanNotFoundError || e instanceof PlanValidationError)
    return e.message
  if (e instanceof Error) return e.message
  return 'Unexpected error'
}

/**
 * Server implementations of the plan tools, bound to one user. Every call is
 * scoped through the repository's `ownerId` argument — the model can never
 * reach another user's data, and the user id never comes from the client.
 */
export function planTools(userId: string, repo: PlanRepository) {
  const listPlans = listPlansDef.server(async () => {
    const plans = await repo.list(userId)
    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        daysPerWeek: p.daysPerWeek,
        activityCount: p.activities.length,
      })),
    }
  })

  const getPlan = getPlanDef.server(async ({ planId }) => {
    return { plan: await repo.getById(planId, userId) }
  })

  const summarizePlan = summarizePlanDef.server(async ({ planId }) => {
    const plan = await repo.getById(planId, userId)
    if (!plan) return { found: false, summary: null }
    return {
      found: true,
      summary: {
        name: plan.name,
        totalSeconds: plan.activities.reduce((s, a) => s + a.duration, 0),
        exerciseCount: plan.activities.filter((a) => a.type === 'exercise')
          .length,
        restCount: plan.activities.filter((a) => a.type === 'rest').length,
        daysPerWeek: plan.daysPerWeek,
      },
    }
  })

  const createPlan = createPlanDef.server(async (input) => {
    try {
      // `description` is optional in the tool input (schema default); the domain
      // model requires a string.
      return {
        plan: await repo.create(
          {
            ...input,
            description: input.description ?? '',
            activities: input.activities.map(withDefaultDuration),
          },
          userId,
        ),
      }
    } catch (e) {
      return { error: errText(e) }
    }
  })

  const updatePlan = updatePlanDef.server(async ({ planId, patch }) => {
    try {
      const domainPatch = {
        ...patch,
        activities: patch.activities?.map(withDefaultDuration),
      }
      return { plan: await repo.update(planId, domainPatch, userId) }
    } catch (e) {
      return { error: errText(e) }
    }
  })

  const addActivity = addActivityDef.server(
    async ({ planId, activity, position }) => {
      try {
        const existing = await repo.getById(planId, userId)
        if (!existing) return { error: new PlanNotFoundError(planId).message }
        const activities: NewActivity[] = [...existing.activities]
        const idx =
          position === undefined
            ? activities.length
            : Math.min(position, activities.length)
        activities.splice(idx, 0, withDefaultDuration(activity))
        return { plan: await repo.update(planId, { activities }, userId) }
      } catch (e) {
        return { error: errText(e) }
      }
    },
  )

  // Destructive: `needsApproval` on the definition pauses execution until the
  // client approves. The repository is idempotent and owner-scoped either way.
  const deletePlan = deletePlanDef.server(async ({ planId }) => {
    await repo.remove(planId, userId)
    return { deleted: true, id: planId }
  })

  return [
    listPlans,
    getPlan,
    summarizePlan,
    createPlan,
    updatePlan,
    addActivity,
    deletePlan,
  ]
}
