import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { DbClient } from './client'
import { db as defaultDb } from './client'

/** Applies all pending migrations from ./drizzle. Idempotent. */
export function runMigrations(db: DbClient = defaultDb): void {
  migrate(db, { migrationsFolder: './drizzle' })
}
