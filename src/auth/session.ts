import type { PublicUser } from '../domain/users'
import { readAccessCookie, readRefreshCookie, setAccessCookie } from './cookies'
import { verifyAccessToken } from './tokens'

/**
 * Resolves the current user for the request, or null. Identity comes from the
 * signed access-token cookie (no DB hit on the happy path). When the access
 * token is missing or expired, falls back to a silent refresh from the refresh
 * cookie so a 15-minute access lapse doesn't drop an otherwise-valid session.
 * Must be called inside a request scope (server function handler or middleware).
 */
export async function getSessionUser(): Promise<PublicUser | null> {
  const access = readAccessCookie()
  if (access) {
    const user = await verifyAccessToken(access)
    if (user) return user
  }
  return silentRefresh()
}

/**
 * Mints (and sets) a fresh access cookie from a still-valid refresh cookie.
 * DB-touching imports are dynamic so this stays out of the client bundle.
 */
async function silentRefresh(): Promise<PublicUser | null> {
  const refreshToken = readRefreshCookie()
  if (!refreshToken) return null

  const { getDb } = await import('../db/client')
  const { runMigrations } = await import('../db/migrate')
  const { resolveSilentRefresh } = await import('./silent-refresh')

  const db = getDb()
  runMigrations(db) // idempotent
  const result = await resolveSilentRefresh(refreshToken, db)
  if (!result) return null

  setAccessCookie(result.accessToken)
  return result.user
}
