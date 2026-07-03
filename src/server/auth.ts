import { createServerFn } from '@tanstack/react-start'
import type { PublicUser } from '../domain/users'
import type { DbClient } from '../db/client'
import type { RefreshTokenStore, UserRepository } from '../repositories'
import { loginSchema, registerSchema } from '../auth/validation'

// Every import that reaches into server-only code (better-sqlite3, argon2, jose,
// request context) is done lazily inside handlers so TanStack Start tree-shakes
// it out of the client bundle — same pattern as src/server/plans.ts. The
// type-only imports above are erased at compile time, so they are safe here.

interface AuthDeps {
  db: DbClient
  users: UserRepository
  refreshStore: RefreshTokenStore
}

async function getAuthDeps(): Promise<AuthDeps> {
  const { getDb } = await import('../db/client')
  const { runMigrations } = await import('../db/migrate')
  const { SqliteUserRepository } =
    await import('../repositories/sqlite-user-repository')
  const { SqliteRefreshTokenStore } =
    await import('../repositories/sqlite-refresh-token-store')

  const db = getDb()
  runMigrations(db) // idempotent
  return {
    db,
    users: new SqliteUserRepository(db),
    refreshStore: new SqliteRefreshTokenStore(db),
  }
}

/** Sets response status then returns an Error to throw — keeps call sites terse. */
async function authError(message: string, status: number): Promise<Error> {
  const { setResponseStatus } = await import('@tanstack/react-start/server')
  setResponseStatus(status)
  return new Error(message)
}

/** Lightweight CSRF defence for cookie-authenticated non-GET RPCs (SameSite=Lax
 * is the primary guard; this rejects obvious cross-origin posts). */
async function assertSameOrigin(): Promise<void> {
  const { getRequestHeader } = await import('@tanstack/react-start/server')
  const origin = getRequestHeader('origin')
  if (!origin) return // non-browser or same-origin navigation without Origin
  const host = getRequestHeader('host')
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw await authError('Bad origin.', 403)
  }
  if (originHost !== host)
    throw await authError('Cross-origin request rejected.', 403)
}

async function clientIp(): Promise<string> {
  const { getRequestIP } = await import('@tanstack/react-start/server')
  return getRequestIP() ?? 'unknown'
}

/** Signs tokens, records the refresh jti, and sets both auth cookies. */
async function issueSession(
  user: PublicUser,
  refreshStore: AuthDeps['refreshStore'],
): Promise<void> {
  const { signAccessToken, signRefreshToken } = await import('../auth/tokens')
  const { setAuthCookies } = await import('../auth/cookies')
  const access = await signAccessToken(user)
  const refresh = await signRefreshToken(user.id)
  await refreshStore.issue(refresh.jti, user.id, refresh.expiresAt)
  setAuthCookies(access, refresh.token)
}

// Precomputed once so the "user not found" login branch spends the same time
// hashing as the "wrong password" branch (enumeration defence).
let dummyHashPromise: Promise<string> | undefined
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = import('../auth/password').then((m) =>
      m.hashPassword('enumeration-defense-placeholder'),
    )
  }
  return dummyHashPromise
}

export const register = createServerFn({ method: 'POST' })
  .validator(registerSchema)
  .handler(async ({ data }): Promise<PublicUser> => {
    await assertSameOrigin()

    const { checkRateLimit } = await import('../auth/rate-limit')
    if (!checkRateLimit(`register:${await clientIp()}`, 5, 60_000)) {
      throw await authError('Too many attempts. Please try again later.', 429)
    }

    const { hashPassword } = await import('../auth/password')
    const { users: usersTable } = await import('../db/schema')
    const { seedDefaultPlansForOwner } = await import('../db/seed')
    const { createId } = await import('../utils/id')

    const { db, users, refreshStore } = await getAuthDeps()
    const email = data.email.toLowerCase()

    if (await users.getByEmail(email)) {
      throw await authError('That email is already registered.', 409)
    }

    const passwordHash = await hashPassword(data.password)
    const userId = createId('user')
    const now = new Date()

    // Atomic: create the user and clone the default plans they'll start with.
    db.transaction((tx) => {
      tx.insert(usersTable)
        .values({
          id: userId,
          email,
          passwordHash,
          role: 'user',
          createdAt: now,
          updatedAt: now,
        })
        .run()
      seedDefaultPlansForOwner(userId, tx)
    })

    const user: PublicUser = { id: userId, email, role: 'user' }
    await issueSession(user, refreshStore)
    return user
  })

export const login = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<PublicUser> => {
    await assertSameOrigin()

    const { checkRateLimit } = await import('../auth/rate-limit')
    if (!checkRateLimit(`login:${await clientIp()}`, 10, 60_000)) {
      throw await authError('Too many attempts. Please try again later.', 429)
    }

    const { verifyPassword } = await import('../auth/password')
    const { toPublicUser } = await import('../domain/users')
    const { users, refreshStore } = await getAuthDeps()

    const found = await users.getByEmail(data.email.toLowerCase())
    // Always verify against *some* hash so timing doesn't reveal account existence.
    const hashToCheck = found?.passwordHash ?? (await getDummyHash())
    const passwordOk = await verifyPassword(hashToCheck, data.password)

    if (!found || !passwordOk) {
      throw await authError('Invalid email or password.', 401)
    }

    const user = toPublicUser(found)
    await issueSession(user, refreshStore)
    return user
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const { readRefreshCookie, clearAuthCookies } =
    await import('../auth/cookies')
  const { verifyRefreshToken } = await import('../auth/tokens')

  const token = readRefreshCookie()
  if (token) {
    const parsed = await verifyRefreshToken(token)
    if (parsed) {
      const { refreshStore } = await getAuthDeps()
      await refreshStore.revoke(parsed.jti)
    }
  }
  clearAuthCookies()
  return { ok: true }
})

export const refresh = createServerFn({ method: 'POST' }).handler(
  async (): Promise<PublicUser> => {
    await assertSameOrigin()

    const { checkRateLimit } = await import('../auth/rate-limit')
    if (!checkRateLimit(`refresh:${await clientIp()}`, 30, 60_000)) {
      throw await authError('Too many attempts. Please try again later.', 429)
    }

    const { readRefreshCookie, clearAuthCookies } =
      await import('../auth/cookies')
    const { verifyRefreshToken } = await import('../auth/tokens')
    const { toPublicUser } = await import('../domain/users')

    const token = readRefreshCookie()
    if (!token) throw await authError('Not authenticated.', 401)

    const parsed = await verifyRefreshToken(token)
    if (!parsed) {
      clearAuthCookies()
      throw await authError('Invalid session.', 401)
    }

    const { users, refreshStore } = await getAuthDeps()

    if (!(await refreshStore.isActive(parsed.jti))) {
      // Token reuse or revoked — revoke the whole family defensively.
      await refreshStore.revokeAllForUser(parsed.sub)
      clearAuthCookies()
      throw await authError('Session expired. Please sign in again.', 401)
    }

    const found = await users.getById(parsed.sub)
    if (!found) {
      clearAuthCookies()
      throw await authError('Session expired. Please sign in again.', 401)
    }

    // Rotate: revoke the used token, issue a fresh access + refresh pair.
    await refreshStore.revoke(parsed.jti)
    const user = toPublicUser(found)
    await issueSession(user, refreshStore)
    return user
  },
)

export const me = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PublicUser | null> => {
    const { getSessionUser } = await import('../auth/session')
    return (await getSessionUser()) ?? null
  },
)
