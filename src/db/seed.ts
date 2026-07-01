import { DEFAULT_PLANS } from '../domain/plans'
import type { DbClient } from './client'
import { getDb } from './client'
import { activities, plans } from './schema'
import { createId } from '../utils/id'

// Accepts either the top-level client or a transaction handle, so the seeding
// can participate in a caller's transaction (e.g. user registration).
type Writer = DbClient | Parameters<Parameters<DbClient['transaction']>[0]>[0]

/**
 * Clones the built-in `DEFAULT_PLANS` as private, editable plans owned by
 * `ownerId`. Fresh plan/activity IDs are generated so the same templates can be
 * cloned for every user without primary-key collisions. Intended to run inside
 * the registration transaction (pass its `tx` as `db`).
 */
export function seedDefaultPlansForOwner(ownerId: string, db: Writer = getDb()): void {
  const now = new Date()

  for (const plan of DEFAULT_PLANS) {
    const planId = createId('plan')
    db.insert(plans)
      .values({
        id: planId,
        ownerId,
        name: plan.name,
        description: plan.description,
        daysPerWeek: plan.daysPerWeek,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    plan.activities.forEach((activity, position) => {
      db.insert(activities)
        .values({
          id: createId('act'),
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
