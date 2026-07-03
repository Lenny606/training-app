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

// Every method is scoped to `ownerId`: a plan is only ever visible or mutable by
// its owner. Reads for a non-owned id return null; writes throw PlanNotFoundError.
export interface PlanRepository {
  list(ownerId: string): Promise<TrainingPlan[]>
  getById(id: string, ownerId: string): Promise<TrainingPlan | null>
  create(plan: NewTrainingPlan, ownerId: string): Promise<TrainingPlan>
  update(
    id: string,
    patch: Partial<NewTrainingPlan>,
    ownerId: string,
  ): Promise<TrainingPlan>
  remove(id: string, ownerId: string): Promise<void>
  /** Persists a new plan ordering; `orderedIds[i]` is assigned position `i`. Owner-scoped. */
  reorder(orderedIds: string[], ownerId: string): Promise<void>
}
