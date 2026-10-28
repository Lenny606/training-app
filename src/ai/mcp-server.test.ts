import { beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createDb } from '../db/client'
import type { DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { ApiTokenRepository } from '../repositories/api-token-repository'
import { SqlitePlanRepository } from '../repositories/sqlite-plan-repository'
import { SqliteUserRepository } from '../repositories/sqlite-user-repository'
import { WorkoutLogRepository } from '../repositories/workout-log-repository'
import { buildMcpServer } from './mcp-server'

async function makeUser(db: DbClient, email: string): Promise<string> {
  return (
    await new SqliteUserRepository(db).create({ email, passwordHash: 'x' })
  ).id
}

describe('ApiTokenRepository', () => {
  let db: DbClient
  let repo: ApiTokenRepository
  let userId: string

  beforeEach(async () => {
    db = createDb(':memory:')
    runMigrations(db)
    userId = await makeUser(db, 'u@e.com')
    repo = new ApiTokenRepository(db)
  })

  it('authenticates a fresh token and stamps lastUsedAt', () => {
    const { token } = repo.create(userId, 'cli')
    expect(token.startsWith('tap_')).toBe(true)
    expect(repo.authenticate(token)).toBe(userId)
    expect(repo.listForUser(userId)[0].lastUsedAt).toBeInstanceOf(Date)
  })

  it('rejects unknown and revoked tokens', () => {
    const { id, token } = repo.create(userId, 'cli')
    expect(repo.authenticate('tap_nope')).toBeNull()
    repo.revoke(id, userId)
    expect(repo.authenticate(token)).toBeNull()
    expect(repo.listForUser(userId)).toEqual([])
  })

  it("does not let a user revoke someone else's token", async () => {
    const other = await makeUser(db, 'o@e.com')
    const { id, token } = repo.create(userId, 'cli')
    repo.revoke(id, other)
    expect(repo.authenticate(token)).toBe(userId)
  })
})

describe('MCP server', () => {
  let client: Client
  let plans: SqlitePlanRepository
  let userId: string

  beforeEach(async () => {
    const db = createDb(':memory:')
    runMigrations(db)
    userId = await makeUser(db, 'u@e.com')
    plans = new SqlitePlanRepository(db)
    const server = buildMcpServer(userId, plans, new WorkoutLogRepository(db))
    const [clientT, serverT] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test', version: '0' })
    await Promise.all([server.connect(serverT), client.connect(clientT)])
  })

  it('exposes the assistant tools, flagging delete as destructive', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name)
    expect(names).toEqual(
      expect.arrayContaining(['list_plans', 'create_plan', 'delete_plan']),
    )
    expect(names).not.toContain('start_workout')
    expect(
      tools.find((t) => t.name === 'delete_plan')?.annotations?.destructiveHint,
    ).toBe(true)
  })

  it('creates a plan for the token owner, tolerating null optionals', async () => {
    const res = await client.callTool({
      name: 'create_plan',
      arguments: {
        name: 'Push day',
        description: null,
        daysPerWeek: 3,
        activities: [
          {
            name: 'Bench press',
            type: 'exercise',
            duration: 60,
            sets: 3,
            reps: '8',
            weight: null,
          },
          { name: 'Rest', type: 'rest', duration: 90 },
        ],
      },
    })
    expect(res.isError).toBeFalsy()
    const [plan] = await plans.list(userId)
    expect(plan.name).toBe('Push day')
    expect(plan.activities.map((a) => a.name)).toEqual(['Bench press', 'Rest'])
  })
})
