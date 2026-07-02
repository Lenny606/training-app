import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { newPlanInput } from '../db/validation'
import { requireAuth } from '../auth/middleware'

// NOTE: every import below is referenced *only* from within `getRepo`, which is
// itself called only inside server-function handlers. TanStack Start extracts
// handlers into a server bundle and tree-shakes these server-only imports
// (better-sqlite3, migrations) out of the client build.
async function getRepo() {
  const { SqlitePlanRepository } = await import('../repositories/sqlite-plan-repository')
  const { runMigrations } = await import('../db/migrate')

  runMigrations()
  return new SqlitePlanRepository()
}

const planId = z.object({ id: z.string().min(1) })

// Plans are private to their owner. `requireAuth` both enforces authentication
// at the data boundary and provides `context.user`, whose id scopes every query.
export const listPlans = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const repo = await getRepo()
    return repo.list(context.user.id)
  })

export const getPlan = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .validator(planId)
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    return repo.getById(data.id, context.user.id)
  })

export const createPlan = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(newPlanInput)
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    return repo.create(data, context.user.id)
  })

export const updatePlan = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(z.object({ id: z.string().min(1), patch: newPlanInput.partial() }))
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    return repo.update(data.id, data.patch, context.user.id)
  })

export const deletePlan = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(planId)
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    await repo.remove(data.id, context.user.id)
    return { id: data.id }
  })

export const reorderPlans = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(z.object({ orderedIds: z.array(z.string().min(1)) }))
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    await repo.reorder(data.orderedIds, context.user.id)
    return { ok: true }
  })
