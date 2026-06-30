import type { TrainingPlan, NewTrainingPlan } from '../domain/plans'
import { DEFAULT_PLANS } from '../domain/plans'
import type { PlanRepository } from './plan-repository'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'
import { createId } from '../utils/id'

export class LocalStoragePlanRepository implements PlanRepository {
  private readonly storageKey = 'titan_training_plans'

  private isServer(): boolean {
    return typeof window === 'undefined'
  }

  private read(): TrainingPlan[] {
    if (this.isServer()) {
      return DEFAULT_PLANS
    }

    const stored = localStorage.getItem(this.storageKey)
    if (!stored) {
      this.write(DEFAULT_PLANS)
      return DEFAULT_PLANS
    }

    try {
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) {
        return DEFAULT_PLANS
      }
      return parsed
    } catch (e) {
      // Fallback on json corruption
      return DEFAULT_PLANS
    }
  }

  private write(plans: TrainingPlan[]): void {
    if (this.isServer()) {
      throw new Error('Cannot mutate training plans on server side.')
    }
    localStorage.setItem(this.storageKey, JSON.stringify(plans))
  }

  private validate(plan: TrainingPlan | NewTrainingPlan): void {
    const errors: string[] = []

    if (!plan.name || plan.name.trim() === '') {
      errors.push('Plan name must not be empty')
    }

    if (typeof plan.daysPerWeek !== 'number' || plan.daysPerWeek < 1 || plan.daysPerWeek > 7) {
      errors.push('Days per week must be between 1 and 7')
    }

    if (!Array.isArray(plan.activities)) {
      errors.push('Activities must be an array')
    } else {
      plan.activities.forEach((act, idx) => {
        if (!act.name || act.name.trim() === '') {
          errors.push(`Activity at index ${idx} must have a name`)
        }
        if (typeof act.duration !== 'number' || act.duration <= 0) {
          errors.push(`Activity "${act.name || idx}" must have a duration greater than 0`)
        }
        if (act.type !== 'exercise' && act.type !== 'rest') {
          errors.push(`Activity "${act.name || idx}" must be of type 'exercise' or 'rest'`)
        }
      })
    }

    if (errors.length > 0) {
      throw new PlanValidationError(errors)
    }
  }

  async list(): Promise<TrainingPlan[]> {
    return this.read()
  }

  async getById(id: string): Promise<TrainingPlan | null> {
    const plans = this.read()
    return plans.find((p) => p.id === id) || null
  }

  async create(newPlan: NewTrainingPlan): Promise<TrainingPlan> {
    if (this.isServer()) {
      throw new Error('Cannot mutate training plans on server side.')
    }

    this.validate(newPlan)

    const plans = this.read()
    
    // Ensure all activities have IDs
    const activitiesWithIds = newPlan.activities.map((act) => ({
      ...act,
      id: act.id || createId('act'),
    }))

    const createdPlan: TrainingPlan = {
      ...newPlan,
      id: createId('plan'),
      activities: activitiesWithIds,
    }

    plans.push(createdPlan)
    this.write(plans)

    return createdPlan
  }

  async update(id: string, patch: Partial<NewTrainingPlan>): Promise<TrainingPlan> {
    if (this.isServer()) {
      throw new Error('Cannot mutate training plans on server side.')
    }

    const plans = this.read()
    const index = plans.findIndex((p) => p.id === id)

    if (index === -1) {
      throw new PlanNotFoundError(id)
    }

    const existingPlan = plans[index]
    const updatedPlan: TrainingPlan = {
      ...existingPlan,
      ...patch,
      id, // keep original id
    }

    // If activities are updated, make sure they all have ids
    if (patch.activities) {
      updatedPlan.activities = patch.activities.map((act) => ({
        ...act,
        id: act.id || createId('act'),
      }))
    }

    this.validate(updatedPlan)

    plans[index] = updatedPlan
    this.write(plans)

    return updatedPlan
  }

  async remove(id: string): Promise<void> {
    if (this.isServer()) {
      throw new Error('Cannot mutate training plans on server side.')
    }

    const plans = this.read()
    const filtered = plans.filter((p) => p.id !== id)
    
    // Write even if length didn't change (idempotent action)
    this.write(filtered)
  }
}
