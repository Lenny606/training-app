// SERVER-ONLY — never import from the client bundle.

import { eq, desc, and, gte, sql } from 'drizzle-orm'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import {
  workoutLogs,
  workoutActivityLogs,
  plans,
  type WorkoutLogRow,
} from '../db/schema'

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type LogWorkoutInput = {
  userId: string
  planId: string
  durationSeconds: number
  completedAt: Date
  notes?: string
  exercises?: Array<{
    activityId?: string
    activityName: string
    setsCompleted?: number
    reps?: string
    weight?: string
  }>
}

export type WorkoutLogWithPlan = WorkoutLogRow & {
  planName: string
  exerciseCount: number
}

export type ExerciseProgress = {
  activityName: string
  entries: Array<{
    completedAt: Date
    setsCompleted: number | null
    reps: string | null
    weight: string | null
  }>
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class WorkoutLogRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  /**
   * Persist a completed workout session and its per-exercise details.
   * Returns the new log id.
   */
  logWorkout(input: LogWorkoutInput): string {
    const logId = crypto.randomUUID()

    this.db
      .insert(workoutLogs)
      .values({
        id: logId,
        userId: input.userId,
        planId: input.planId,
        durationSeconds: input.durationSeconds,
        completedAt: input.completedAt,
        notes: input.notes ?? null,
      })
      .run()

    if (input.exercises?.length) {
      const rows = input.exercises.map((ex) => ({
        id: crypto.randomUUID(),
        workoutLogId: logId,
        activityId: ex.activityId ?? null,
        activityName: ex.activityName,
        setsCompleted: ex.setsCompleted ?? null,
        reps: ex.reps ?? null,
        weight: ex.weight ?? null,
      }))
      this.db.insert(workoutActivityLogs).values(rows).run()
    }

    return logId
  }

  /**
   * Recent workout history for a user, with plan name.
   * Default: last 30 sessions.
   */
  getHistory(userId: string, limit = 30): WorkoutLogWithPlan[] {
    const rows = this.db
      .select({
        id: workoutLogs.id,
        userId: workoutLogs.userId,
        planId: workoutLogs.planId,
        durationSeconds: workoutLogs.durationSeconds,
        completedAt: workoutLogs.completedAt,
        notes: workoutLogs.notes,
        planName: plans.name,
      })
      .from(workoutLogs)
      .innerJoin(plans, eq(workoutLogs.planId, plans.id))
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.completedAt))
      .limit(limit)
      .all()

    // Count exercises per log in a second query (avoids exploding rows from join)
    return rows.map((row) => {
      const countResult = this.db
        .select({ count: sql<number>`count(*)` })
        .from(workoutActivityLogs)
        .where(eq(workoutActivityLogs.workoutLogId, row.id))
        .get()

      return {
        ...row,
        exerciseCount: countResult?.count ?? 0,
      }
    })
  }

  /**
   * Weekly workout summary — count of sessions and total seconds per week
   * for the last N weeks.
   */
  getWeeklySummary(
    userId: string,
    weeks = 8,
  ): Array<{
    weekStart: string
    sessionCount: number
    totalSeconds: number
  }> {
    const since = new Date()
    since.setDate(since.getDate() - weeks * 7)

    const rows = this.db
      .select({
        completedAt: workoutLogs.completedAt,
        durationSeconds: workoutLogs.durationSeconds,
      })
      .from(workoutLogs)
      .where(
        and(
          eq(workoutLogs.userId, userId),
          gte(workoutLogs.completedAt, since),
        ),
      )
      .all()

    // Group client-side (SQLite date functions are limited; avoids raw SQL)
    const buckets = new Map<
      string,
      { sessionCount: number; totalSeconds: number }
    >()

    for (const row of rows) {
      const d = new Date(row.completedAt)
      // ISO week Monday
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      const key = monday.toISOString().slice(0, 10)

      const existing = buckets.get(key) ?? { sessionCount: 0, totalSeconds: 0 }
      existing.sessionCount += 1
      existing.totalSeconds += row.durationSeconds
      buckets.set(key, existing)
    }

    return Array.from(buckets.entries())
      .map(([weekStart, data]) => ({ weekStart, ...data }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  }

  /**
   * Progress for a specific exercise — weight/reps trend over time.
   */
  getExerciseProgress(
    userId: string,
    activityName: string,
    limit = 20,
  ): ExerciseProgress {
    // Join through workout_logs to enforce userId scoping
    const rows = this.db
      .select({
        completedAt: workoutLogs.completedAt,
        setsCompleted: workoutActivityLogs.setsCompleted,
        reps: workoutActivityLogs.reps,
        weight: workoutActivityLogs.weight,
      })
      .from(workoutActivityLogs)
      .innerJoin(
        workoutLogs,
        eq(workoutActivityLogs.workoutLogId, workoutLogs.id),
      )
      .where(
        and(
          eq(workoutLogs.userId, userId),
          eq(workoutActivityLogs.activityName, activityName),
        ),
      )
      .orderBy(desc(workoutLogs.completedAt))
      .limit(limit)
      .all()

    return {
      activityName,
      entries: rows
        .map((r) => ({
          completedAt: new Date(r.completedAt),
          setsCompleted: r.setsCompleted,
          reps: r.reps,
          weight: r.weight,
        }))
        .reverse(), // chronological order for trend analysis
    }
  }

  /**
   * Count of sessions in the last N days.
   */
  countRecentSessions(userId: string, days = 7): number {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const result = this.db
      .select({ count: sql<number>`count(*)` })
      .from(workoutLogs)
      .where(
        and(
          eq(workoutLogs.userId, userId),
          gte(workoutLogs.completedAt, since),
        ),
      )
      .get()

    return result?.count ?? 0
  }
}
