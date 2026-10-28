import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware'

// Personal API tokens for the remote MCP endpoint. Same lazy server-only import
// pattern as `server/plans.ts#getRepo`.
async function getRepo() {
  const { ApiTokenRepository } =
    await import('../repositories/api-token-repository')
  const { runMigrations } = await import('../db/migrate')

  runMigrations()
  return new ApiTokenRepository()
}

export const listApiTokens = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const repo = await getRepo()
    return repo.listForUser(context.user.id)
  })

/** Returns the plaintext token once; only its hash is stored. */
export const createApiToken = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(z.object({ name: z.string().trim().min(1).max(64) }))
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    return repo.create(context.user.id, data.name)
  })

export const revokeApiToken = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    repo.revoke(data.id, context.user.id)
    return { id: data.id }
  })
