import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/client'
import type { DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { seedDefaultPlansForOwner } from '../db/seed'
import { DEFAULT_PLANS } from '../domain/plans'
import { SqlitePlanRepository } from '../repositories/sqlite-plan-repository'
import { SqliteUserRepository } from '../repositories/sqlite-user-repository'
import { WorkoutLogRepository } from '../repositories/workout-log-repository'
import { buildTools } from './tools'

// Validate `input` the same way @tanstack/ai's executor does (standard-schema
// parse against the tool's inputSchema) before calling execute. Models — GPT-4o
// mini in particular — send explicit `null` for optional fields, so the real
// path must tolerate nulls that `tool.execute(input)` alone would never see.
async function parseInput(tool: { inputSchema: unknown }, input: unknown) {
  const schema = tool.inputSchema as {
    '~standard': {
      validate: (
        v: unknown,
      ) =>
        | { value: unknown; issues?: undefined }
        | { issues: Array<{ message: string }> }
    }
  }
  const result = await schema['~standard'].validate(input)
  if (result.issues)
    throw new Error(result.issues.map((i) => i.message).join(', '))
  return result.value
}

async function makeOwner(db: DbClient, email: string): Promise<string> {
  const users = new SqliteUserRepository(db)
  const user = await users.create({ email, passwordHash: 'x' })
  return user.id
}

describe('AI plan tools', () => {
  let db: DbClient
  let repo: SqlitePlanRepository
  let ownerId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: Array<any>

  // Invoke a tool by name with the given input, bypassing schema conversion —
  // this is exactly what chat() does once the model produces valid arguments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function run(name: string, input: any = {}): Promise<any> {
    const tool = tools.find((t) => t.name === name)
    if (!tool) throw new Error(`tool not found: ${name}`)
    return tool.execute(input)
  }

  beforeEach(async () => {
    db = createDb(':memory:')
    runMigrations(db)
    ownerId = await makeOwner(db, 'owner@example.com')
    seedDefaultPlansForOwner(ownerId, db)
    repo = new SqlitePlanRepository(db)
    tools = buildTools(ownerId, repo, new WorkoutLogRepository(db))
  })

  async function firstPlanId(): Promise<string> {
    const { plans } = await run('list_plans')
    return plans[0].id
  }

  describe('list_plans', () => {
    it('lists the seeded plans with an activity count', async () => {
      const { plans } = await run('list_plans')
      expect(plans).toHaveLength(DEFAULT_PLANS.length)
      expect(plans[0].name).toBe(DEFAULT_PLANS[0].name)
      expect(plans[0].activityCount).toBe(DEFAULT_PLANS[0].activities.length)
    })
  })

  describe('get_plan', () => {
    it('returns the full plan', async () => {
      const id = await firstPlanId()
      const { plan } = await run('get_plan', { planId: id })
      expect(plan?.id).toBe(id)
      expect(plan?.activities.length).toBeGreaterThan(0)
    })

    it('returns null for a missing plan', async () => {
      const { plan } = await run('get_plan', { planId: 'nope' })
      expect(plan).toBeNull()
    })
  })

  describe('summarize_plan', () => {
    it('computes totals', async () => {
      const id = await firstPlanId()
      const { found, summary } = await run('summarize_plan', { planId: id })
      const source = DEFAULT_PLANS[0]
      expect(found).toBe(true)
      expect(summary.totalSeconds).toBe(
        source.activities.reduce((s, a) => s + a.duration, 0),
      )
      expect(summary.exerciseCount).toBe(
        source.activities.filter((a) => a.type === 'exercise').length,
      )
      expect(summary.restCount).toBe(
        source.activities.filter((a) => a.type === 'rest').length,
      )
    })

    it('reports not found', async () => {
      const { found, summary } = await run('summarize_plan', { planId: 'nope' })
      expect(found).toBe(false)
      expect(summary).toBeNull()
    })
  })

  describe('create_plan', () => {
    it('creates a plan', async () => {
      const { plan } = await run('create_plan', {
        name: 'Custom',
        daysPerWeek: 3,
        activities: [{ name: 'Bench', duration: 120, type: 'exercise' }],
      })
      expect(plan.id).toMatch(/^plan-/)
      expect(await repo.getById(plan.id, ownerId)).not.toBeNull()
    })

    it('returns a readable error on invalid input instead of throwing', async () => {
      const result = await run('create_plan', {
        name: '',
        daysPerWeek: 9,
        activities: [{ name: '', duration: -1, type: 'exercise' }],
      })
      expect(result.plan).toBeUndefined()
      expect(typeof result.error).toBe('string')
    })
  })

  describe('update_plan', () => {
    it('patches scalar fields', async () => {
      const id = await firstPlanId()
      const { plan } = await run('update_plan', {
        planId: id,
        patch: { name: 'Renamed' },
      })
      expect(plan.name).toBe('Renamed')
    })

    it('errors on a missing plan', async () => {
      const result = await run('update_plan', {
        planId: 'nope',
        patch: { name: 'X' },
      })
      expect(result.plan).toBeUndefined()
      expect(result.error).toContain('nope')
    })
  })

  describe('add_activity', () => {
    it('appends an activity by default', async () => {
      const id = await firstPlanId()
      const before = (await run('get_plan', { planId: id })).plan.activities
        .length
      const { plan } = await run('add_activity', {
        planId: id,
        activity: { name: 'Plank', duration: 90, type: 'exercise' },
      })
      expect(plan.activities).toHaveLength(before + 1)
      expect(plan.activities[plan.activities.length - 1].name).toBe('Plank')
    })

    it('inserts at a position', async () => {
      const id = await firstPlanId()
      const { plan } = await run('add_activity', {
        planId: id,
        position: 0,
        activity: { name: 'Warmup', duration: 60, type: 'exercise' },
      })
      expect(plan.activities[0].name).toBe('Warmup')
    })

    it('accepts explicit nulls for optional fields (LLM-style arguments)', async () => {
      const id = await firstPlanId()
      const tool = tools.find((t) => t.name === 'add_activity')
      const input = await parseInput(tool, {
        planId: id,
        position: null,
        activity: {
          id: null,
          name: 'Plank',
          duration: null,
          type: 'exercise',
          sets: 3,
          reps: '45s',
          weight: null,
          media: null,
        },
      })
      const { plan, error } = await tool.execute(input)
      expect(error).toBeUndefined()
      const added = plan.activities[plan.activities.length - 1]
      expect(added.name).toBe('Plank')
      expect(added.duration).toBe(120) // default applied for null
    })
  })

  describe('update_plan with LLM-style nulls', () => {
    it('treats null patch fields as omitted', async () => {
      const id = await firstPlanId()
      const tool = tools.find((t) => t.name === 'update_plan')
      const input = await parseInput(tool, {
        planId: id,
        patch: {
          name: 'Renamed',
          description: null,
          daysPerWeek: null,
          activities: null,
        },
      })
      const { plan, error } = await tool.execute(input)
      expect(error).toBeUndefined()
      expect(plan.name).toBe('Renamed')
      expect(plan.activities.length).toBeGreaterThan(0) // null ≠ replace with []
    })
  })

  describe('delete_plan', () => {
    it('removes the plan', async () => {
      const id = await firstPlanId()
      const { deleted } = await run('delete_plan', { planId: id })
      expect(deleted).toBe(true)
      expect(await repo.getById(id, ownerId)).toBeNull()
    })
  })

  describe('start_workout', () => {
    it('returns ok for a runnable plan', async () => {
      const id = await firstPlanId()
      const result = await run('start_workout', { planId: id })
      expect(result.ok).toBe(true)
      expect(result.planId).toBe(id)
    })

    it('errors for a missing plan', async () => {
      const result = await run('start_workout', { planId: 'nope' })
      expect(result.ok).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('errors for a plan with no activities', async () => {
      const { plan } = await run('create_plan', {
        name: 'Empty',
        daysPerWeek: 1,
        activities: [],
      })
      const result = await run('start_workout', { planId: plan.id })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('no activities')
    })
  })

  describe('owner scoping', () => {
    it('never exposes another user’s plans', async () => {
      const intruderId = await makeOwner(db, 'intruder@example.com')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intruderTools: Array<any> = buildTools(intruderId, repo)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runAs = (n: string, input: any = {}): Promise<any> => {
        const tool = intruderTools.find((t) => t.name === n)
        if (!tool) throw new Error(`tool not found: ${n}`)
        return tool.execute(input)
      }

      const victimPlanId = await firstPlanId()

      expect((await runAs('list_plans')).plans).toHaveLength(0)
      expect(
        (await runAs('get_plan', { planId: victimPlanId })).plan,
      ).toBeNull()

      // A scoped delete is a no-op against a non-owned plan; the owner keeps it.
      await runAs('delete_plan', { planId: victimPlanId })
      expect(await repo.getById(victimPlanId, ownerId)).not.toBeNull()
    })
  })

  describe('get_plan_progress', () => {
    it('reports not found for a missing plan', async () => {
      const result = await run('get_plan_progress', { planId: 'nope' })
      expect(result.found).toBe(false)
      expect(result.exercises).toHaveLength(0)
    })

    it('returns plan targets with empty history when nothing is logged', async () => {
      const id = await firstPlanId()
      const result = await run('get_plan_progress', { planId: id })
      expect(result.found).toBe(true)
      expect(result.planName).toBe(DEFAULT_PLANS[0].name)
      const exerciseCount = DEFAULT_PLANS[0].activities.filter(
        (a) => a.type === 'exercise',
      ).length
      expect(result.exercises).toHaveLength(exerciseCount)
      expect(result.exercises[0].recent).toHaveLength(0)
    })

    it('pairs plan targets with recent logged performances', async () => {
      const { plan } = await run('create_plan', {
        name: 'Push',
        daysPerWeek: 2,
        activities: [
          {
            name: 'Bench',
            duration: 120,
            type: 'exercise',
            sets: 3,
            reps: '8',
            weight: '60kg',
          },
          { name: 'Rest', duration: 60, type: 'rest' },
        ],
      })
      await run('log_workout', {
        planId: plan.id,
        durationSeconds: 1800,
        completedAt: new Date().toISOString(),
        exercises: [
          { activityName: 'Bench', setsCompleted: 3, reps: '8', weight: '60kg' },
        ],
      })

      const result = await run('get_plan_progress', { planId: plan.id })
      expect(result.found).toBe(true)
      // Rest activities are excluded
      expect(result.exercises).toHaveLength(1)
      const bench = result.exercises[0]
      expect(bench.activityName).toBe('Bench')
      expect(bench.target).toEqual({ sets: 3, reps: '8', weight: '60kg' })
      expect(bench.recent).toHaveLength(1)
      expect(bench.recent[0].weight).toBe('60kg')
    })

    it('accepts explicit null for perExerciseLimit (LLM-style arguments)', async () => {
      const id = await firstPlanId()
      const tool = tools.find((t) => t.name === 'get_plan_progress')
      const input = await parseInput(tool, {
        planId: id,
        perExerciseLimit: null,
      })
      const result = await tool.execute(input)
      expect(result.found).toBe(true)
    })
  })

  describe('create_plan with learning activity', () => {
    it('creates a plan with a learning activity and saves its description', async () => {
      const tool = tools.find((t) => t.name === 'create_plan')
      const input = await parseInput(tool, {
        name: 'Learning Plan via AI',
        description: 'Testing description support',
        daysPerWeek: 2,
        activities: [
          {
            name: 'Study form',
            type: 'learning',
            duration: 150,
            description: 'Read the instructions carefully',
          },
        ],
      })
      const { plan, error } = await tool.execute(input)
      expect(error).toBeUndefined()
      expect(plan.activities[0].type).toBe('learning')
      expect(plan.activities[0].description).toBe(
        'Read the instructions carefully',
      )
    })
  })
})
