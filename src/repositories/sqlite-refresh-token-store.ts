import { and, eq, isNull, gt } from 'drizzle-orm'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { refreshTokens } from '../db/schema'
import type { RefreshTokenStore } from './refresh-token-store'

/** Drizzle/SQLite-backed refresh-token allow-list. Server-only. */
export class SqliteRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly db: DbClient = getDb()) {}

  async issue(jti: string, userId: string, expiresAt: Date): Promise<void> {
    this.db
      .insert(refreshTokens)
      .values({
        id: jti,
        userId,
        expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      })
      .run()
  }

  async isActive(jti: string): Promise<boolean> {
    const row = this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.id, jti),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .get()
    return !!row
  }

  async revoke(jti: string): Promise<void> {
    this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, jti), isNull(refreshTokens.revokedAt)))
      .run()
  }

  async revokeAllForUser(userId: string): Promise<void> {
    this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      )
      .run()
  }
}
