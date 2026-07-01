import { SignJWT, jwtVerify } from 'jose'
import type { PublicUser } from '../domain/users'
import { createId } from '../utils/id'
import { getJwtSecret } from './env'

export const ACCESS_TTL_SECONDS = 15 * 60 // 15 minutes
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

const ALG = 'HS256'

export interface IssuedRefreshToken {
  token: string
  jti: string
  expiresAt: Date
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/** Signs a short-lived access token carrying the full `PublicUser` projection. */
export function signAccessToken(user: PublicUser): Promise<string> {
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(nowSeconds() + ACCESS_TTL_SECONDS)
    .sign(getJwtSecret())
}

/** Signs a long-lived refresh token; its `jti` must be recorded in the store. */
export async function signRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const jti = createId('rt')
  const expiresAt = new Date((nowSeconds() + REFRESH_TTL_SECONDS) * 1000)
  const token = await new SignJWT({ typ: 'refresh' })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getJwtSecret())
  return { token, jti, expiresAt }
}

/** Cryptographically verifies an access token, returning the `PublicUser` or null. */
export async function verifyAccessToken(token: string): Promise<PublicUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null
    if (payload.role !== 'user' && payload.role !== 'admin') return null
    return { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

/** Verifies a refresh token's signature/expiry. Store validity is checked separately. */
export async function verifyRefreshToken(
  token: string,
): Promise<{ sub: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.typ !== 'refresh') return null
    if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') return null
    return { sub: payload.sub, jti: payload.jti }
  } catch {
    return null
  }
}
