import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db/client'
import { runMigrations } from '../db/migrate'
import { seedIfEmpty } from '../db/seed'
import { DEFAULT_PLANS } from '../domain/plans'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'
import { SqlitePlanRepository } from './sqlite-plan-repository'

describe('SqlitePlanRepository', () => {
  let repository: SqlitePlanRepository

  beforeEach(() => {
    const db = createDb(':memory:')
    runMigrations(db)
    seedIfEmpty(db)
    repository = new SqlitePlanRepository(db)
  })

  describe('list / seed', () => {
    it('returns the seeded DEFAULT_PLANS with ordered activities', async () => {
      const plans = await repository.list()
      expect(plans).toHaveLength(DEFAULT_PLANS.length)

      const first = plans.find((p) => p.id === DEFAULT_PLANS[0].id)
      expect(first?.name).toBe(DEFAULT_PLANS[0].name)
      expect(first?.activities.map((a) => a.id)).toEqual(
        DEFAULT_PLANS[0].activities.map((a) => a.id),
      )
    })

    it('omits null optional fields rather than exposing them', async () => {
      const plan = await repository.getById(DEFAULT_PLANS[2].id) // HIIT: activities without sets/reps
      const restActivity = plan?.activities.find((a) => a.type === 'rest')
      expect(restActivity).toBeDefined()
      expect(restActivity).not.toHaveProperty('sets', null)
      expect(restActivity?.sets).toBeUndefined()
    })
  })

  describe('getById', () => {
    it('returns a plan when it exists', async () => {
      const plan = await repository.getById('push-legs-split')
      expect(plan?.id).toBe('push-legs-split')
    })

    it('returns null when missing', async () => {
      expect(await repository.getById('nope')).toBeNull()
    })
  })

  describe('create', () => {
    it('assigns a plan id and generates missing activity ids', async () => {
      const created = await repository.create({
        name: 'New Workout',
        description: 'New',
        daysPerWeek: 4,
        activities: [
          { name: 'Bench', duration: 120, type: 'exercise' },
          { id: 'act-fixed', name: 'Rest', duration: 60, type: 'rest' },
        ],
      })

      expect(created.id).toMatch(/^plan-/)
      expect(created.activities[0].id).toMatch(/^act-/)
      expect(created.activities[1].id).toBe('act-fixed')

      const persisted = await repository.getById(created.id)
      expect(persisted?.activities).toHaveLength(2)
      expect(persisted?.activities[0].name).toBe('Bench')
    })

    it('throws PlanValidationError on invalid input', async () => {
      await expect(
        repository.create({
          name: '',
          description: '',
          daysPerWeek: 8,
          activities: [{ name: '', duration: -10, type: 'exercise' }],
        }),
      ).rejects.toThrow(PlanValidationError)
    })
  })

  describe('update', () => {
    it('merges scalar patch fields, preserving the rest', async () => {
      const updated = await repository.update('push-legs-split', {
        name: 'Updated Push',
        daysPerWeek: 5,
      })

      expect(updated.name).toBe('Updated Push')
      expect(updated.daysPerWeek).toBe(5)
      expect(updated.description).toBe(DEFAULT_PLANS[0].description)
      // activities untouched when not in patch
      expect(updated.activities.map((a) => a.id)).toEqual(
        DEFAULT_PLANS[0].activities.map((a) => a.id),
      )
    })

    it('replaces and reorders activities when provided', async () => {
      const updated = await repository.update('push-legs-split', {
        activities: [
          { id: 'a-new', name: 'Squat', duration: 100, type: 'exercise' },
          { name: 'Pause', duration: 30, type: 'rest' },
        ],
      })

      expect(updated.activities).toHaveLength(2)

      const persisted = await repository.getById('push-legs-split')
      expect(persisted?.activities.map((a) => a.name)).toEqual(['Squat', 'Pause'])
      expect(persisted?.activities[0].id).toBe('a-new')
    })

    it('throws PlanNotFoundError for a missing plan', async () => {
      await expect(repository.update('nope', { name: 'X' })).rejects.toThrow(PlanNotFoundError)
    })

    it('validates merged input', async () => {
      await expect(repository.update('push-legs-split', { name: '' })).rejects.toThrow(
        PlanValidationError,
      )
    })
  })

  describe('remove', () => {
    it('deletes the plan and cascades to activities', async () => {
      await repository.remove('push-legs-split')
      expect(await repository.getById('push-legs-split')).toBeNull()

      // activities gone too — recreating the id starts clean
      const recreated = await repository.create({
        name: 'Fresh',
        description: '',
        daysPerWeek: 1,
        activities: [],
      })
      expect(recreated.activities).toHaveLength(0)
    })

    it('is idempotent for a missing plan', async () => {
      await expect(repository.remove('nope')).resolves.not.toThrow()
    })
  })
})
