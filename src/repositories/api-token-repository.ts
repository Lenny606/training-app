import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { apiTokens } from '../db/schema'
import { createId } from '../utils/id'

/** Prefix makes leaked tokens greppable (secret scanners, logs). */
export const API_TOKEN_PREFIX = 'tap_'

export interface ApiTokenSummary {
  id: string
  name: string
  lastUsedAt: Date | null
  createdAt: Date
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Drizzle/SQLite-backed personal API tokens. Server-only. Tokens are high
 * entropy (256 bit), so a plain SHA-256 lookup is sufficient — no slow KDF.
 */
export class ApiTokenRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  /** Creates a token and returns its plaintext — the only time it is visible. */
  create(userId: string, name: string): { id: string; token: string } {
    const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url')
    const id = createId('tok')
    this.db
      .insert(apiTokens)
      .values({
        id,
        userId,
        name,
        tokenHash: hashApiToken(token),
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
      })
      .run()
    return { id, token }
  }

  /** Resolves an active token to its owner id and stamps `lastUsedAt`. */
  authenticate(token: string): string | null {
    if (!token.startsWith(API_TOKEN_PREFIX)) return null
    const row = this.db
      .select({ id: apiTokens.id, userId: apiTokens.userId })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.tokenHash, hashApiToken(token)),
          isNull(apiTokens.revokedAt),
        ),
      )
      .get()
    if (!row) return null
    this.db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.id))
      .run()
    return row.userId
  }

  listForUser(userId: string): ApiTokenSummary[] {
    return this.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
      .orderBy(desc(apiTokens.createdAt))
      .all()
  }

  revoke(id: string, userId: string): void {
    this.db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiTokens.id, id),
          eq(apiTokens.userId, userId),
          isNull(apiTokens.revokedAt),
        ),
      )
      .run()
  }
}
