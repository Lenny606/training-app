import { eq } from 'drizzle-orm'
import type { Role, User } from '../domain/users'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import type { UserRow } from '../db/schema'
import { createId } from '../utils/id'
import type { NewUser, UserRepository } from './user-repository'
import { EmailTakenError, UserNotFoundError } from './user-repository'

/** Drizzle/SQLite-backed user repository. Server-only — relies on better-sqlite3. */
export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  private toUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async getById(id: string): Promise<User | null> {
    const row = this.db.select().from(users).where(eq(users.id, id)).get()
    return row ? this.toUser(row) : null
  }

  async getByEmail(email: string): Promise<User | null> {
    const row = this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get()
    return row ? this.toUser(row) : null
  }

  async create(newUser: NewUser): Promise<User> {
    const email = newUser.email.toLowerCase()
    const existing = this.db.select().from(users).where(eq(users.email, email)).get()
    if (existing) throw new EmailTakenError(email)

    const now = new Date()
    const row: UserRow = {
      id: createId('user'),
      email,
      passwordHash: newUser.passwordHash,
      role: newUser.role ?? 'user',
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(users).values(row).run()
    return this.toUser(row)
  }

  async updateRole(id: string, role: Role): Promise<User> {
    const updated = this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
      .get()
    if (!updated) throw new UserNotFoundError(id)
    return this.toUser(updated)
  }
}
