// SERVER-ONLY — never import from the client bundle.

import type { PlanRepository } from '../../repositories/plan-repository'
import { WorkoutLogRepository } from '../../repositories/workout-log-repository'
import {
  logWorkoutDef,
  getWorkoutHistoryDef,
  getExerciseProgressDef,
  getPlanProgressDef,
} from './definitions'

/**
 * Server implementations of the workout logging / analytics tools.
 * Every call is scoped to `userId` — the model cannot read or write
 * another user's history.
 */
export function loggingTools(
  userId: string,
  repo: PlanRepository,
  logRepo: WorkoutLogRepository = new WorkoutLogRepository(),
) {

  // -------------------------------------------------------------------------
  // log_workout — persist a completed session
  // -------------------------------------------------------------------------
  const logWorkout = logWorkoutDef.server(async (input) => {
    // Verify the plan belongs to the user before logging
    const plan = await repo.getById(input.planId, userId)
    if (!plan) {
      return {
        ok: false,
        error: `Plan "${input.planId}" was not found or does not belong to you.`,
      }
    }

    try {
      const logId = logRepo.logWorkout({
        userId,
        planId: input.planId,
        durationSeconds: input.durationSeconds,
        completedAt: new Date(input.completedAt),
        notes: input.notes ?? undefined,
        exercises: input.exercises?.map((ex) => ({
          activityId: ex.activityId ?? undefined,
          activityName: ex.activityName,
          setsCompleted: ex.setsCompleted ?? undefined,
          reps: ex.reps ?? undefined,
          weight: ex.weight ?? undefined,
        })),
      })

      return { ok: true, logId }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to save workout log.',
      }
    }
  })

  // -------------------------------------------------------------------------
  // get_workout_history — recent sessions overview
  // -------------------------------------------------------------------------
  const getWorkoutHistory = getWorkoutHistoryDef.server(async (input) => {
    const limit = input.limit ?? 10
    const history = logRepo.getHistory(userId, limit)
    const recentCount = logRepo.countRecentSessions(userId, 7)

    const sessions = history.map((h) => ({
      id: h.id,
      planName: h.planName,
      durationSeconds: h.durationSeconds,
      completedAt: h.completedAt.toISOString(),
      notes: h.notes,
      exerciseCount: h.exerciseCount,
    }))

    const weeklySummary = input.includWeeklySummary
      ? logRepo.getWeeklySummary(userId)
      : undefined

    return { sessions, weeklySummary, recentCount }
  })

  // -------------------------------------------------------------------------
  // get_exercise_progress — weight/reps trend for one exercise
  // -------------------------------------------------------------------------
  const getExerciseProgress = getExerciseProgressDef.server(async (input) => {
    const progress = logRepo.getExerciseProgress(
      userId,
      input.activityName,
      input.limit ?? 15,
    )

    return {
      activityName: progress.activityName,
      entries: progress.entries.map((e) => ({
        completedAt: e.completedAt.toISOString(),
        setsCompleted: e.setsCompleted,
        reps: e.reps,
        weight: e.weight,
      })),
      hasData: progress.entries.length > 0,
    }
  })

  // -------------------------------------------------------------------------
  // get_plan_progress — plan targets vs. recent actuals, per exercise
  // -------------------------------------------------------------------------
  const getPlanProgress = getPlanProgressDef.server(async (input) => {
    const plan = await repo.getById(input.planId, userId)
    if (!plan) return { found: false, planName: null, exercises: [] }

    const limit = input.perExerciseLimit ?? 3
    const exercises = plan.activities
      .filter((a) => a.type === 'exercise')
      .map((a) => {
        const progress = logRepo.getExerciseProgress(userId, a.name, limit)
        return {
          activityName: a.name,
          target: {
            sets: a.sets ?? null,
            reps: a.reps ?? null,
            weight: a.weight ?? null,
          },
          recent: progress.entries.map((e) => ({
            completedAt: e.completedAt.toISOString(),
            setsCompleted: e.setsCompleted,
            reps: e.reps,
            weight: e.weight,
          })),
        }
      })

    return { found: true, planName: plan.name, exercises }
  })

  return [logWorkout, getWorkoutHistory, getExerciseProgress, getPlanProgress]
}
