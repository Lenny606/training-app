// Production migration runner — uses ONLY runtime deps (better-sqlite3,
// drizzle-orm), so it works after `npm ci --omit=dev` on the VPS where
// drizzle-kit (a devDependency) is absent. Applies SQL files from ./drizzle.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const dbPath = process.env.DATABASE_URL ?? './data/app.db'

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

migrate(drizzle(sqlite), { migrationsFolder: './drizzle' })
sqlite.close()

console.log(`Migrations applied to ${dbPath}`)
