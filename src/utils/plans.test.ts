// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredPlans, saveStoredPlans, DEFAULT_PLANS } from './plans'
import type { TrainingPlan } from './plans'

describe('plans utility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStoredPlans', () => {
    it('returns DEFAULT_PLANS and initializes localStorage if empty', () => {
      expect(localStorage.getItem('titan_training_plans')).toBeNull()
      const plans = getStoredPlans()
      expect(plans).toEqual(DEFAULT_PLANS)
      expect(JSON.parse(localStorage.getItem('titan_training_plans') || '')).toEqual(DEFAULT_PLANS)
    })

    it('returns stored plans from localStorage if present', () => {
      const customPlans: TrainingPlan[] = [
        {
          id: 'custom-1',
          name: 'Custom Workout Plan',
          description: 'A custom program.',
          daysPerWeek: 3,
          activities: [
            {
              id: 'act-1',
              name: 'Pushups',
              duration: 60,
              type: 'exercise'
            }
          ]
        }
      ]
      localStorage.setItem('titan_training_plans', JSON.stringify(customPlans))

      const plans = getStoredPlans()
      expect(plans).toEqual(customPlans)
    })

    it('falls back to DEFAULT_PLANS if localStorage content is invalid JSON', () => {
      localStorage.setItem('titan_training_plans', 'invalid json string')
      const plans = getStoredPlans()
      expect(plans).toEqual(DEFAULT_PLANS)
    })
  })

  describe('saveStoredPlans', () => {
    it('saves the provided plans to localStorage', () => {
      const customPlans: TrainingPlan[] = [
        {
          id: 'custom-2',
          name: 'Another Custom Plan',
          description: 'Test descriptions.',
          daysPerWeek: 5,
          activities: []
        }
      ]

      saveStoredPlans(customPlans)
      expect(JSON.parse(localStorage.getItem('titan_training_plans') || '')).toEqual(customPlans)
    })
  })
})
