import type { TrainingPlan, NewTrainingPlan } from '../domain/plans'

export class PlanNotFoundError extends Error {
  constructor(id: string) {
    super(`Training plan with ID "${id}" was not found.`)
    this.name = 'PlanNotFoundError'
  }
}

export class PlanValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed for training plan: ${errors.join(', ')}`)
    this.name = 'PlanValidationError'
  }
}

export interface PlanRepository {
  list(): Promise<TrainingPlan[]>
  getById(id: string): Promise<TrainingPlan | null>
  create(plan: NewTrainingPlan): Promise<TrainingPlan>
  update(id: string, patch: Partial<NewTrainingPlan>): Promise<TrainingPlan>
  remove(id: string): Promise<void>
}
