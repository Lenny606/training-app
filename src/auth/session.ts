import type { PublicUser } from '../domain/users'
import { readAccessCookie } from './cookies'
import { verifyAccessToken } from './tokens'

/**
 * Resolves the current user from the access-token cookie, or null. Identity is
 * taken from the signed claims (no DB hit). Must be called inside a request
 * scope (server function handler or middleware `.server()`).
 */
export async function getSessionUser(): Promise<PublicUser | null> {
  const token = readAccessCookie()
  if (!token) return null
  return verifyAccessToken(token)
}
