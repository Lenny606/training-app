import { describe, it, expect, beforeEach } from 'vitest'
import { createDb } from '../db/client'
import { runMigrations } from '../db/migrate'
import { WorkoutLogRepository } from './workout-log-repository'
import { SqlitePlanRepository } from './sqlite-plan-repository'
import { SqliteUserRepository } from './sqlite-user-repository'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  const db = createDb(':memory:')
  runMigrations(db)
  return db
}

async function seedUser(db: ReturnType<typeof createDb>) {
  const userRepo = new SqliteUserRepository(db)
  return userRepo.create({ email: 'tester@apex.io', passwordHash: 'hash' })
}

async function seedPlan(
  db: ReturnType<typeof createDb>,
  userId: string,
) {
  const planRepo = new SqlitePlanRepository(db)
  return planRepo.create(
    {
      name: 'Push Day',
      description: '',
      daysPerWeek: 3,
      activities: [
        {
          name: 'Bench Press',
          type: 'exercise',
          duration: 60,
          sets: 4,
          reps: '8',
          weight: '80kg',
        },
        {
          name: 'Rest',
          type: 'rest',
          duration: 90,
        },
      ],
    },
    userId,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkoutLogRepository', () => {
  let db: ReturnType<typeof createDb>
  let userId: string
  let planId: string
  let logRepo: WorkoutLogRepository

  beforeEach(async () => {
    db = makeDb()
    const user = await seedUser(db)
    userId = user.id
    const plan = await seedPlan(db, userId)
    planId = plan.id
    logRepo = new WorkoutLogRepository(db)
  })

  it('logs a workout and returns a logId', () => {
    const logId = logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 2700,
      completedAt: new Date(),
    })
    expect(logId).toBeTypeOf('string')
    expect(logId.length).toBeGreaterThan(0)
  })

  it('logs a workout with exercise details', () => {
    const logId = logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 3000,
      completedAt: new Date(),
      notes: 'Felt strong today',
      exercises: [
        {
          activityName: 'Bench Press',
          setsCompleted: 4,
          reps: '8',
          weight: '82.5kg',
        },
      ],
    })
    expect(logId).toBeTypeOf('string')

    const progress = logRepo.getExerciseProgress(userId, 'Bench Press')
    expect(progress.entries).toHaveLength(1)
    expect(progress.entries[0].weight).toBe('82.5kg')
  })

  it('getHistory returns logged sessions with planName', () => {
    const d1 = new Date('2026-06-01T08:00:00Z')
    const d2 = new Date('2026-06-02T08:00:00Z') // more recent

    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 1800,
      completedAt: d1,
    })
    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 2400,
      completedAt: d2,
    })

    const history = logRepo.getHistory(userId)
    expect(history).toHaveLength(2)
    expect(history[0].planName).toBe('Push Day')
    expect(history[0].durationSeconds).toBe(2400) // most recent first (d2)
  })

  it('getHistory is scoped to the user', async () => {
    // Create a second user
    const userRepo2 = new SqliteUserRepository(db)
    const user2 = await userRepo2.create({
      email: 'other@apex.io',
      passwordHash: 'hash2',
    })
    const planRepo2 = new SqlitePlanRepository(db)
    const plan2 = await planRepo2.create(
      { name: 'Leg Day', description: '', daysPerWeek: 2, activities: [] },
      user2.id,
    )
    logRepo.logWorkout({
      userId: user2.id,
      planId: plan2.id,
      durationSeconds: 1200,
      completedAt: new Date(),
    })

    // user 1 has no logs yet
    const history = logRepo.getHistory(userId)
    expect(history).toHaveLength(0)
  })

  it('countRecentSessions returns sessions within window', () => {
    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 1800,
      completedAt: new Date(),
    })
    expect(logRepo.countRecentSessions(userId, 7)).toBe(1)
  })

  it('getWeeklySummary groups sessions by ISO week', () => {
    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 1800,
      completedAt: new Date(),
    })
    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 2700,
      completedAt: new Date(),
    })

    const summary = logRepo.getWeeklySummary(userId, 4)
    expect(summary).toHaveLength(1) // both in the same week
    expect(summary[0].sessionCount).toBe(2)
    expect(summary[0].totalSeconds).toBe(4500)
  })

  it('getExerciseProgress returns entries in chronological order', () => {
    const d1 = new Date('2026-01-01T10:00:00Z')
    const d2 = new Date('2026-01-08T10:00:00Z')

    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 3000,
      completedAt: d1,
      exercises: [{ activityName: 'Squat', weight: '100kg', reps: '5' }],
    })
    logRepo.logWorkout({
      userId,
      planId,
      durationSeconds: 3000,
      completedAt: d2,
      exercises: [{ activityName: 'Squat', weight: '105kg', reps: '5' }],
    })

    const progress = logRepo.getExerciseProgress(userId, 'Squat')
    expect(progress.entries).toHaveLength(2)
    // chronological: oldest first
    expect(progress.entries[0].weight).toBe('100kg')
    expect(progress.entries[1].weight).toBe('105kg')
  })
})
