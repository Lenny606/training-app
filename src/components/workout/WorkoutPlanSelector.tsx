import { Link } from '@tanstack/react-router'
import { Dumbbell, Settings } from 'lucide-react'
import type { TrainingPlan } from '../../domain/plans'

interface WorkoutPlanSelectorProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  onPlanChange: (planId: string) => void
}

function getPlanSummary(plan: TrainingPlan) {
  const exercises = plan.activities.filter((a) => a.type === 'exercise').length
  const minutes = Math.round(
    plan.activities.reduce((sum, a) => sum + a.duration, 0) / 60,
  )
  return [
    `${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}`,
    `${minutes} min`,
    `${plan.daysPerWeek}× per week`,
  ]
}

export function WorkoutPlanSelector({
  plans,
  selectedPlanId,
  onPlanChange,
}: WorkoutPlanSelectorProps) {
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  return (
    <section className="demo-panel p-4 rounded-2xl rise-in flex flex-col gap-3">
      <label
        htmlFor="plan-select"
        className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5"
      >
        <Dumbbell className="h-4 w-4 text-lagoon" aria-hidden />
        Training Plan
      </label>

      <div className="flex gap-2">
        <select
          id="plan-select"
          value={selectedPlanId}
          onChange={(e) => onPlanChange(e.target.value)}
          className="demo-select min-w-0 flex-grow font-display text-sm font-bold"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <Link
          to="/admin"
          className="demo-button demo-button-secondary h-11 w-11 flex-shrink-0 rounded-xl p-0"
          title="Configure Plans"
          aria-label="Configure Plans"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {selectedPlan && selectedPlan.activities.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {getPlanSummary(selectedPlan).map((item) => (
              <li key={item} className="demo-pill py-1 tabular-nums">
                {item}
              </li>
            ))}
          </ul>
          {selectedPlan.description && (
            <p className="m-0 text-xs leading-relaxed text-ink-soft">
              {selectedPlan.description}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
