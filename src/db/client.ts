import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DB_PATH = process.env.DATABASE_URL ?? './data/app.db'

function createSqlite(path: string): Database.Database {
  // In-memory DBs (':memory:') have no directory to create.
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON') // cascade delete on activities
  return sqlite
}

export type DbClient = ReturnType<typeof drizzle<typeof schema>>

/**
 * Builds a Drizzle client over a fresh better-sqlite3 connection.
 * Exposed for tests, which spin up isolated (temp / in-memory) databases.
 */
export function createDb(path: string = DB_PATH): DbClient {
  return drizzle(createSqlite(path), { schema })
}

let cachedDb: DbClient | undefined

/**
 * Shared, process-wide DB client, created lazily on first use. Server-only —
 * never import into the client bundle. Lazy so merely importing a repository
 * module (e.g. in a test that uses its own in-memory db) does not open the
 * production database file and contend on its WAL lock.
 */
export function getDb(): DbClient {
  return (cachedDb ??= createDb())
}
