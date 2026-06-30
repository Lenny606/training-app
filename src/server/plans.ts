import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { newPlanInput } from '../db/validation'

// NOTE: every import below is referenced *only* from within `getRepo`, which is
// itself called only inside server-function handlers. TanStack Start extracts
// handlers into a server bundle and tree-shakes these server-only imports
// (better-sqlite3, migrations, seed) out of the client build.
async function getRepo() {
  const { SqlitePlanRepository } = await import('../repositories/sqlite-plan-repository')
  const { runMigrations } = await import('../db/migrate')
  const { seedIfEmpty } = await import('../db/seed')

  runMigrations()
  seedIfEmpty()
  return new SqlitePlanRepository()
}

const planId = z.object({ id: z.string().min(1) })

export const listPlans = createServerFn({ method: 'GET' }).handler(async () => {
  const repo = await getRepo()
  return repo.list()
})

export const getPlan = createServerFn({ method: 'GET' })
  .validator(planId)
  .handler(async ({ data }) => {
    const repo = await getRepo()
    return repo.getById(data.id)
  })

export const createPlan = createServerFn({ method: 'POST' })
  .validator(newPlanInput)
  .handler(async ({ data }) => {
    const repo = await getRepo()
    return repo.create(data)
  })

export const updatePlan = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), patch: newPlanInput.partial() }))
  .handler(async ({ data }) => {
    const repo = await getRepo()
    return repo.update(data.id, data.patch)
  })

export const deletePlan = createServerFn({ method: 'POST' })
  .validator(planId)
  .handler(async ({ data }) => {
    const repo = await getRepo()
    await repo.remove(data.id)
    return { id: data.id }
  })
