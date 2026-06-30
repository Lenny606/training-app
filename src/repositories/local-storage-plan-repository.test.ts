// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStoragePlanRepository } from './local-storage-plan-repository'
import { DEFAULT_PLANS } from '../domain/plans'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'

describe('LocalStoragePlanRepository', () => {
  let repository: LocalStoragePlanRepository

  beforeEach(() => {
    localStorage.clear()
    repository = new LocalStoragePlanRepository()
  })

  describe('list', () => {
    it('should seed DEFAULT_PLANS when localStorage is empty', async () => {
      expect(localStorage.getItem('titan_training_plans')).toBeNull()
      const plans = await repository.list()
      expect(plans).toEqual(DEFAULT_PLANS)
      expect(JSON.parse(localStorage.getItem('titan_training_plans') || '')).toEqual(DEFAULT_PLANS)
    })

    it('should return stored plans from localStorage', async () => {
      const customPlans = [
        {
          id: 'plan-1',
          name: 'Custom Workout',
          description: 'Desc',
          daysPerWeek: 3,
          activities: [],
        },
      ]
      localStorage.setItem('titan_training_plans', JSON.stringify(customPlans))
      const plans = await repository.list()
      expect(plans).toEqual(customPlans)
    })

    it('should fallback to DEFAULT_PLANS if stored JSON is invalid', async () => {
      localStorage.setItem('titan_training_plans', 'invalid-json')
      const plans = await repository.list()
      expect(plans).toEqual(DEFAULT_PLANS)
    })
  })

  describe('getById', () => {
    it('should return a plan if it exists', async () => {
      const plan = await repository.getById('push-legs-split')
      expect(plan).not.toBeNull()
      expect(plan?.id).toBe('push-legs-split')
    })

    it('should return null if the plan does not exist', async () => {
      const plan = await repository.getById('non-existent')
      expect(plan).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a plan, assign a unique ID, and generate activity IDs if missing', async () => {
      const newPlan = {
        name: 'New Workout',
        description: 'New Description',
        daysPerWeek: 4,
        activities: [
          {
            name: 'Bench Press',
            duration: 120,
            type: 'exercise' as const,
          },
          {
            id: 'act-prespecified',
            name: 'Rest',
            duration: 60,
            type: 'rest' as const,
          },
        ],
      }

      const created = await repository.create(newPlan)
      expect(created.id).toMatch(/^plan-/)
      expect(created.name).toBe('New Workout')
      expect(created.activities[0].id).toMatch(/^act-/)
      expect(created.activities[1].id).toBe('act-prespecified')

      const plans = await repository.list()
      expect(plans.some((p) => p.id === created.id)).toBe(true)
    })

    it('should throw PlanValidationError if validation fails', async () => {
      const invalidPlan = {
        name: '', // Empty name
        description: 'No Name',
        daysPerWeek: 8, // Invalid days
        activities: [
          {
            name: '', // Empty activity name
            duration: -10, // Invalid duration
            type: 'invalid-type' as any,
          },
        ],
      }

      await expect(repository.create(invalidPlan)).rejects.toThrow(PlanValidationError)
    })
  })

  describe('update', () => {
    it('should merge patch updates into an existing plan', async () => {
      const updated = await repository.update('push-legs-split', {
        name: 'Updated Push Day',
        daysPerWeek: 4,
      })

      expect(updated.id).toBe('push-legs-split')
      expect(updated.name).toBe('Updated Push Day')
      expect(updated.daysPerWeek).toBe(4)
      expect(updated.description).toBe(DEFAULT_PLANS[0].description) // preserved
    })

    it('should throw PlanNotFoundError if the plan does not exist', async () => {
      await expect(
        repository.update('non-existent', { name: 'Oops' })
      ).rejects.toThrow(PlanNotFoundError)
    })

    it('should validate inputs during update', async () => {
      await expect(
        repository.update('push-legs-split', { name: '' })
      ).rejects.toThrow(PlanValidationError)
    })
  })

  describe('remove', () => {
    it('should remove the plan with the given ID', async () => {
      await repository.remove('push-legs-split')
      const plan = await repository.getById('push-legs-split')
      expect(plan).toBeNull()
    })

    it('should be idempotent and not throw if the plan does not exist', async () => {
      await expect(repository.remove('non-existent')).resolves.not.toThrow()
    })
  })
})
