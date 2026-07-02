import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Activity, NewTrainingPlan, TrainingPlan } from '../domain/plans'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { activities, plans } from '../db/schema'
import type { ActivityRow } from '../db/schema'
import { newPlanInput } from '../db/validation'
import { createId } from '../utils/id'
import type { PlanRepository } from './plan-repository'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'

/** Drizzle/SQLite-backed repository. Server-only — relies on better-sqlite3. */
export class SqlitePlanRepository implements PlanRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  private toActivity(row: ActivityRow): Activity {
    return {
      id: row.id,
      name: row.name,
      duration: row.duration,
      type: row.type,
      sets: row.sets ?? undefined,
      reps: row.reps ?? undefined,
      weight: row.weight ?? undefined,
    }
  }

  private validate(plan: NewTrainingPlan): void {
    const result = newPlanInput.safeParse(plan)
    if (!result.success) {
      throw new PlanValidationError(result.error.issues.map((i) => i.message))
    }
  }

  async list(ownerId: string): Promise<TrainingPlan[]> {
    const planRows = this.db
      .select()
      .from(plans)
      .where(eq(plans.ownerId, ownerId))
      .orderBy(asc(plans.position), asc(plans.createdAt))
      .all()
    if (planRows.length === 0) return []

    const activityRows = this.db
      .select()
      .from(activities)
      .where(
        inArray(
          activities.planId,
          planRows.map((p) => p.id),
        ),
      )
      .orderBy(asc(activities.position))
      .all()

    return planRows.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      daysPerWeek: plan.daysPerWeek,
      activities: activityRows
        .filter((a) => a.planId === plan.id)
        .map((a) => this.toActivity(a)),
    }))
  }

  async getById(id: string, ownerId: string): Promise<TrainingPlan | null> {
    const plan = this.db
      .select()
      .from(plans)
      .where(and(eq(plans.id, id), eq(plans.ownerId, ownerId)))
      .get()
    if (!plan) return null

    const activityRows = this.db
      .select()
      .from(activities)
      .where(eq(activities.planId, id))
      .orderBy(asc(activities.position))
      .all()

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      daysPerWeek: plan.daysPerWeek,
      activities: activityRows.map((a) => this.toActivity(a)),
    }
  }

  async create(newPlan: NewTrainingPlan, ownerId: string): Promise<TrainingPlan> {
    this.validate(newPlan)

    const planId = createId('plan')
    const now = new Date()
    // Append new plans to the end of the owner's ordering.
    const position = this.db.select().from(plans).where(eq(plans.ownerId, ownerId)).all().length
    const created: TrainingPlan = {
      ...newPlan,
      id: planId,
      activities: newPlan.activities.map((act) => ({
        ...act,
        id: act.id || createId('act'),
      })),
    }

    this.db.transaction((tx) => {
      tx.insert(plans)
        .values({
          id: planId,
          ownerId,
          name: created.name,
          description: created.description,
          daysPerWeek: created.daysPerWeek,
          position,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      this.insertActivities(tx, planId, created.activities)
    })

    return created
  }

  async update(
    id: string,
    patch: Partial<NewTrainingPlan>,
    ownerId: string,
  ): Promise<TrainingPlan> {
    const existing = await this.getById(id, ownerId)
    if (!existing) throw new PlanNotFoundError(id)

    const merged: TrainingPlan = {
      ...existing,
      ...patch,
      id,
      activities: patch.activities
        ? patch.activities.map((act) => ({ ...act, id: act.id || createId('act') }))
        : existing.activities,
    }

    this.validate({
      name: merged.name,
      description: merged.description,
      daysPerWeek: merged.daysPerWeek,
      activities: merged.activities,
    })

    this.db.transaction((tx) => {
      tx.update(plans)
        .set({
          name: merged.name,
          description: merged.description,
          daysPerWeek: merged.daysPerWeek,
          updatedAt: new Date(),
        })
        .where(and(eq(plans.id, id), eq(plans.ownerId, ownerId)))
        .run()

      // Reorder/replace activities via delete + insert (small plans → fine).
      if (patch.activities) {
        tx.delete(activities).where(eq(activities.planId, id)).run()
        this.insertActivities(tx, id, merged.activities)
      }
    })

    return merged
  }

  async remove(id: string, ownerId: string): Promise<void> {
    // Idempotent + owner-scoped; FK cascade removes child activities.
    this.db.delete(plans).where(and(eq(plans.id, id), eq(plans.ownerId, ownerId))).run()
  }

  async reorder(orderedIds: string[], ownerId: string): Promise<void> {
    const now = new Date()
    // Owner-scoped: an id the user doesn't own updates zero rows (safe no-op).
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(plans)
          .set({ position, updatedAt: now })
          .where(and(eq(plans.id, id), eq(plans.ownerId, ownerId)))
          .run()
      })
    })
  }

  private insertActivities(
    tx: Parameters<Parameters<DbClient['transaction']>[0]>[0],
    planId: string,
    list: Activity[],
  ): void {
    list.forEach((activity, position) => {
      tx.insert(activities)
        .values({
          id: activity.id,
          planId,
          position,
          name: activity.name,
          duration: activity.duration,
          type: activity.type,
          sets: activity.sets ?? null,
          reps: activity.reps ?? null,
          weight: activity.weight ?? null,
        })
        .run()
    })
  }
}
