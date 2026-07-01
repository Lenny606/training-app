import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/client'
import { runMigrations } from '../db/migrate'
import { EmailTakenError, UserNotFoundError } from './user-repository'
import { SqliteUserRepository } from './sqlite-user-repository'

describe('SqliteUserRepository', () => {
  let repository: SqliteUserRepository

  beforeEach(() => {
    const db = createDb(':memory:')
    runMigrations(db)
    repository = new SqliteUserRepository(db)
  })

  it('creates a user with default role and generated id', async () => {
    const user = await repository.create({ email: 'a@example.com', passwordHash: 'h' })
    expect(user.id).toMatch(/^user-/)
    expect(user.role).toBe('user')
    expect(user.email).toBe('a@example.com')
  })

  it('normalises email to lowercase on create and lookup', async () => {
    await repository.create({ email: 'Mixed@Example.COM', passwordHash: 'h' })
    const found = await repository.getByEmail('mixed@example.com')
    expect(found?.email).toBe('mixed@example.com')
  })

  it('rejects duplicate emails (case-insensitive)', async () => {
    await repository.create({ email: 'dup@example.com', passwordHash: 'h' })
    await expect(
      repository.create({ email: 'DUP@example.com', passwordHash: 'h' }),
    ).rejects.toThrow(EmailTakenError)
  })

  it('getById returns the user or null', async () => {
    const created = await repository.create({ email: 'b@example.com', passwordHash: 'h' })
    expect((await repository.getById(created.id))?.email).toBe('b@example.com')
    expect(await repository.getById('nope')).toBeNull()
  })

  it('updateRole promotes a user and throws for a missing id', async () => {
    const created = await repository.create({ email: 'c@example.com', passwordHash: 'h' })
    const updated = await repository.updateRole(created.id, 'admin')
    expect(updated.role).toBe('admin')
    await expect(repository.updateRole('nope', 'admin')).rejects.toThrow(UserNotFoundError)
  })
})
