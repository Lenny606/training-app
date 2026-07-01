import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/client'
import type { DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { SqliteUserRepository } from './sqlite-user-repository'
import { SqliteRefreshTokenStore } from './sqlite-refresh-token-store'

const HOUR = 60 * 60 * 1000

describe('SqliteRefreshTokenStore', () => {
  let store: SqliteRefreshTokenStore
  let userId: string
  let db: DbClient

  beforeEach(async () => {
    db = createDb(':memory:')
    runMigrations(db)
    userId = (await new SqliteUserRepository(db).create({ email: 'u@e.com', passwordHash: 'h' })).id
    store = new SqliteRefreshTokenStore(db)
  })

  it('treats an issued token as active', async () => {
    await store.issue('jti-1', userId, new Date(Date.now() + HOUR))
    expect(await store.isActive('jti-1')).toBe(true)
  })

  it('treats an unknown token as inactive', async () => {
    expect(await store.isActive('ghost')).toBe(false)
  })

  it('treats an expired token as inactive', async () => {
    await store.issue('jti-exp', userId, new Date(Date.now() - HOUR))
    expect(await store.isActive('jti-exp')).toBe(false)
  })

  it('revoke makes a token inactive and is idempotent', async () => {
    await store.issue('jti-2', userId, new Date(Date.now() + HOUR))
    await store.revoke('jti-2')
    expect(await store.isActive('jti-2')).toBe(false)
    await expect(store.revoke('jti-2')).resolves.not.toThrow()
  })

  it('revokeAllForUser invalidates every active token', async () => {
    await store.issue('a', userId, new Date(Date.now() + HOUR))
    await store.issue('b', userId, new Date(Date.now() + HOUR))
    await store.revokeAllForUser(userId)
    expect(await store.isActive('a')).toBe(false)
    expect(await store.isActive('b')).toBe(false)
  })
})
