import { DEFAULT_PLANS } from '../domain/plans'
import type { TrainingPlan } from '../domain/plans'

export * from '../domain/plans'

export function getStoredPlans(): TrainingPlan[] {
  if (typeof window === 'undefined') return DEFAULT_PLANS
  const stored = localStorage.getItem('titan_training_plans')
  if (!stored) {
    localStorage.setItem('titan_training_plans', JSON.stringify(DEFAULT_PLANS))
    return DEFAULT_PLANS
  }
  try {
    return JSON.parse(stored)
  } catch (e) {
    return DEFAULT_PLANS
  }
}

export function saveStoredPlans(plans: TrainingPlan[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('titan_training_plans', JSON.stringify(plans))
}
