import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/client'
import type { DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { SqliteRefreshTokenStore } from '../repositories/sqlite-refresh-token-store'
import { SqliteUserRepository } from '../repositories/sqlite-user-repository'
import { resolveSilentRefresh } from './silent-refresh'
import { signRefreshToken, verifyAccessToken } from './tokens'

describe('resolveSilentRefresh', () => {
  let db: DbClient
  let userId: string
  let store: SqliteRefreshTokenStore

  async function issueRefresh(forUserId: string): Promise<string> {
    const rt = await signRefreshToken(forUserId)
    await store.issue(rt.jti, forUserId, rt.expiresAt)
    return rt.token
  }

  beforeEach(async () => {
    db = createDb(':memory:')
    runMigrations(db)
    store = new SqliteRefreshTokenStore(db)
    const user = await new SqliteUserRepository(db).create({
      email: 'owner@example.com',
      passwordHash: 'x',
    })
    userId = user.id
  })

  it('mints a valid access token for an active refresh token', async () => {
    const token = await issueRefresh(userId)
    const result = await resolveSilentRefresh(token, db)

    expect(result).not.toBeNull()
    expect(result?.user.id).toBe(userId)
    expect(await verifyAccessToken(result!.accessToken)).toMatchObject({
      id: userId,
    })
  })

  it('returns null for a revoked refresh token (logout ends the session)', async () => {
    const rt = await signRefreshToken(userId)
    await store.issue(rt.jti, userId, rt.expiresAt)
    await store.revoke(rt.jti)

    expect(await resolveSilentRefresh(rt.token, db)).toBeNull()
  })

  it('returns null for a refresh token never recorded in the store', async () => {
    const rt = await signRefreshToken(userId) // signed but not issued
    expect(await resolveSilentRefresh(rt.token, db)).toBeNull()
  })

  it('returns null for a garbage token', async () => {
    expect(await resolveSilentRefresh('not-a-jwt', db)).toBeNull()
  })

  it('does not rotate: the refresh token stays active after a silent refresh', async () => {
    const rt = await signRefreshToken(userId)
    await store.issue(rt.jti, userId, rt.expiresAt)

    await resolveSilentRefresh(rt.token, db)
    expect(await store.isActive(rt.jti)).toBe(true)
  })
})
