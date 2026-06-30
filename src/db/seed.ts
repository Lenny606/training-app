import { sql } from 'drizzle-orm'
import { DEFAULT_PLANS } from '../domain/plans'
import type { DbClient } from './client'
import { db as defaultDb } from './client'
import { activities, plans } from './schema'

/**
 * Seeds `DEFAULT_PLANS` into an empty database. No-op if any plan already
 * exists, so it is safe to call on every boot. Preserves the fixed seed IDs
 * and derives `position` from activity order.
 */
export function seedIfEmpty(db: DbClient = defaultDb): void {
  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(plans)
    .all()

  if (count > 0) return

  const now = new Date()

  db.transaction((tx) => {
    for (const plan of DEFAULT_PLANS) {
      tx.insert(plans)
        .values({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          daysPerWeek: plan.daysPerWeek,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      plan.activities.forEach((activity, position) => {
        tx.insert(activities)
          .values({
            id: activity.id,
            planId: plan.id,
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
  })
}
