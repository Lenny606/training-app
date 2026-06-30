import { LocalStoragePlanRepository } from './local-storage-plan-repository'
import type { PlanRepository } from './plan-repository'

export * from './plan-repository'
export const planRepository: PlanRepository = new LocalStoragePlanRepository()
