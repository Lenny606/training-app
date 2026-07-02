import type { DbClient } from '../db/client'
import type { PublicUser } from '../domain/users'
import { toPublicUser } from '../domain/users'
import { SqliteRefreshTokenStore } from '../repositories/sqlite-refresh-token-store'
import { SqliteUserRepository } from '../repositories/sqlite-user-repository'
import { signAccessToken, verifyRefreshToken } from './tokens'

// SERVER-ONLY (pulls in better-sqlite3 via the repos). Reach it only through the
// dynamic import in session.ts so it never lands in the client bundle.

export interface SilentRefreshResult {
  user: PublicUser
  accessToken: string
}

/**
 * Mints a fresh access token from a refresh-token string, provided the refresh
 * token is cryptographically valid AND still active in the store (so logout /
 * revocation ends the session at once). Returns the user + new access token, or
 * null if the refresh token can't be honoured.
 *
 * Deliberately does NOT rotate the refresh token. Silent refresh runs on every
 * protected request (via getSessionUser); rotating here would let two concurrent
 * requests present the same jti and trip the refresh-reuse detector, nuking a
 * live session. Rotation stays on the explicit `refresh` endpoint. Kept free of
 * request/cookie I/O so it is unit-testable against an in-memory DB.
 */
export async function resolveSilentRefresh(
  refreshToken: string,
  db: DbClient,
): Promise<SilentRefreshResult | null> {
  const parsed = await verifyRefreshToken(refreshToken)
  if (!parsed) return null

  const refreshStore = new SqliteRefreshTokenStore(db)
  if (!(await refreshStore.isActive(parsed.jti))) return null

  const users = new SqliteUserRepository(db)
  const found = await users.getById(parsed.sub)
  if (!found) return null

  const user = toPublicUser(found)
  return { user, accessToken: await signAccessToken(user) }
}
