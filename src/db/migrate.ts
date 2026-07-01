import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { DbClient } from './client'
import { getDb } from './client'

/** Applies all pending migrations from ./drizzle. Idempotent. */
export function runMigrations(db: DbClient = getDb()): void {
  migrate(db, { migrationsFolder: './drizzle' })
}
