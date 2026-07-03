import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Activity, NewTrainingPlan, TrainingPlan, Media } from '../domain/plans'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { activities, plans, media } from '../db/schema'
import type { ActivityRow } from '../db/schema'
import { newPlanInput } from '../db/validation'
import { createId } from '../utils/id'
import type { PlanRepository } from './plan-repository'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'
import fs from 'node:fs'
import path from 'node:path'
import { getUploadDir } from '../utils/upload'

/** Drizzle/SQLite-backed repository. Server-only — relies on better-sqlite3. */
export class SqlitePlanRepository implements PlanRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  private toActivity(row: ActivityRow, mediaList?: Media[]): Activity {
    return {
      id: row.id,
      name: row.name,
      duration: row.duration,
      type: row.type,
      sets: row.sets ?? undefined,
      reps: row.reps ?? undefined,
      weight: row.weight ?? undefined,
      media: mediaList && mediaList.length > 0 ? mediaList : undefined,
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

    const activityMediaRows = this.db
      .select({
        activity: activities,
        media: media,
      })
      .from(activities)
      .leftJoin(media, eq(media.activityId, activities.id))
      .where(
        inArray(
          activities.planId,
          planRows.map((p) => p.id),
        ),
      )
      .orderBy(asc(activities.position))
      .all()

    const activityMap = new Map<string, Activity>()
    const planActivitiesMap = new Map<string, Activity[]>()

    for (const row of activityMediaRows) {
      const actId = row.activity.id
      let existing = activityMap.get(actId)
      if (!existing) {
        existing = this.toActivity(row.activity, [])
        activityMap.set(actId, existing)

        const pId = row.activity.planId
        if (!planActivitiesMap.has(pId)) {
          planActivitiesMap.set(pId, [])
        }
        planActivitiesMap.get(pId)!.push(existing)
      }
      if (row.media) {
        if (!existing.media) {
          existing.media = []
        }
        existing.media.push({
          id: row.media.id,
          fileName: row.media.fileName,
          originalName: row.media.originalName,
          mimeType: row.media.mimeType,
          fileSize: row.media.fileSize,
        })
      }
    }

    return planRows.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      daysPerWeek: plan.daysPerWeek,
      activities: planActivitiesMap.get(plan.id) || [],
    }))
  }

  async getById(id: string, ownerId: string): Promise<TrainingPlan | null> {
    const plan = this.db
      .select()
      .from(plans)
      .where(and(eq(plans.id, id), eq(plans.ownerId, ownerId)))
      .get()
    if (!plan) return null

    const activityMediaRows = this.db
      .select({
        activity: activities,
        media: media,
      })
      .from(activities)
      .leftJoin(media, eq(media.activityId, activities.id))
      .where(eq(activities.planId, id))
      .orderBy(asc(activities.position))
      .all()

    const activityMap = new Map<string, Activity>()
    const activityOrder: string[] = []

    for (const row of activityMediaRows) {
      const actId = row.activity.id
      let existing = activityMap.get(actId)
      if (!existing) {
        existing = this.toActivity(row.activity, [])
        activityMap.set(actId, existing)
        activityOrder.push(actId)
      }
      if (row.media) {
        if (!existing.media) {
          existing.media = []
        }
        existing.media.push({
          id: row.media.id,
          fileName: row.media.fileName,
          originalName: row.media.originalName,
          mimeType: row.media.mimeType,
          fileSize: row.media.fileSize,
        })
      }
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      daysPerWeek: plan.daysPerWeek,
      activities: activityOrder.map((actId) => activityMap.get(actId)!),
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

      this.insertActivities(tx, planId, created.activities, ownerId)
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
        ? patch.activities.map((act) => ({
            ...act,
            id: act.id || createId('act'),
            media: act.media && act.media.length > 0 ? act.media : undefined,
          }))
        : existing.activities,
    }

    this.validate({
      name: merged.name,
      description: merged.description,
      daysPerWeek: merged.daysPerWeek,
      activities: merged.activities,
    })

    const filesToDelete: string[] = []

    if (patch.activities) {
      // Collect existing media IDs associated with this plan
      const existingMediaMap = new Map<string, { id: string; fileName: string }>()
      for (const act of existing.activities) {
        if (act.media) {
          for (const m of act.media) {
            existingMediaMap.set(m.id, m)
          }
        }
      }

      // Collect kept media IDs from new activities
      const keptMediaIds = new Set<string>()
      for (const act of merged.activities) {
        if (act.media) {
          for (const m of act.media) {
            keptMediaIds.add(m.id)
          }
        }
      }

      // Identify files to delete from disk
      for (const [mId, m] of existingMediaMap.entries()) {
        if (!keptMediaIds.has(mId)) {
          filesToDelete.push(m.fileName)
        }
      }

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

        const existingActIds = new Set(existing.activities.map((a) => a.id))
        const newActIds = new Set(merged.activities.map((a) => a.id))

        // Activities to delete
        const actIdsToDelete = existing.activities
          .map((a) => a.id)
          .filter((aId) => !newActIds.has(aId))

        if (actIdsToDelete.length > 0) {
          tx.delete(activities)
            .where(and(eq(activities.planId, id), inArray(activities.id, actIdsToDelete)))
            .run()
        }

        // Delete removed media rows from database
        const mediaIdsToDelete = Array.from(existingMediaMap.keys()).filter(
          (mId) => !keptMediaIds.has(mId),
        )
        if (mediaIdsToDelete.length > 0) {
          tx.delete(media)
            .where(and(inArray(media.id, mediaIdsToDelete), eq(media.userId, ownerId)))
            .run()
        }

        // Update or insert activities and set their position
        merged.activities.forEach((activity, position) => {
          if (existingActIds.has(activity.id)) {
            tx.update(activities)
              .set({
                position,
                name: activity.name,
                duration: activity.duration,
                type: activity.type,
                sets: activity.sets ?? null,
                reps: activity.reps ?? null,
                weight: activity.weight ?? null,
              })
              .where(and(eq(activities.planId, id), eq(activities.id, activity.id)))
              .run()
          } else {
            tx.insert(activities)
              .values({
                id: activity.id,
                planId: id,
                position,
                name: activity.name,
                duration: activity.duration,
                type: activity.type,
                sets: activity.sets ?? null,
                reps: activity.reps ?? null,
                weight: activity.weight ?? null,
              })
              .run()
          }

          // Link media for this activity
          if (activity.media && activity.media.length > 0) {
            const mediaIds = activity.media.map((m) => m.id)
            tx.update(media)
              .set({ activityId: activity.id })
              .where(and(inArray(media.id, mediaIds), eq(media.userId, ownerId)))
              .run()
          }
        })
      })
    } else {
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
      })
    }

    // Delete files from disk after transaction completes successfully
    if (filesToDelete.length > 0) {
      const uploadDir = getUploadDir()
      for (const fileName of filesToDelete) {
        const filePath = path.join(uploadDir, fileName)
        try {
          fs.unlinkSync(filePath)
        } catch (err) {
          console.error(`Failed to delete media file ${filePath}:`, err)
        }
      }
    }

    return merged
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const plan = await this.getById(id, ownerId)
    if (plan) {
      const fileNames: string[] = []
      for (const act of plan.activities) {
        if (act.media) {
          for (const m of act.media) {
            fileNames.push(m.fileName)
          }
        }
      }

      this.db.delete(plans).where(and(eq(plans.id, id), eq(plans.ownerId, ownerId))).run()

      if (fileNames.length > 0) {
        const uploadDir = getUploadDir()
        for (const fileName of fileNames) {
          const filePath = path.join(uploadDir, fileName)
          try {
            fs.unlinkSync(filePath)
          } catch (err) {
            console.error(`Failed to delete media file ${filePath}:`, err)
          }
        }
      }
    }
  }

  async reorder(orderedIds: string[], ownerId: string): Promise<void> {
    const now = new Date()
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
    ownerId: string,
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

      if (activity.media && activity.media.length > 0) {
        const mediaIds = activity.media.map((m) => m.id)
        tx.update(media)
          .set({ activityId: activity.id })
          .where(and(inArray(media.id, mediaIds), eq(media.userId, ownerId)))
          .run()
      }
    })
  }
}

