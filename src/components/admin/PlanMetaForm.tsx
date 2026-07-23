import { useId } from 'react'
import type { TrainingPlan } from '../../domain/plans'

interface PlanMetaFormProps {
  plan: TrainingPlan
  onChange: (field: keyof TrainingPlan, value: string | number) => void
}

export function PlanMetaForm({ plan, onChange }: PlanMetaFormProps) {
  const formId = useId()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <label htmlFor={`${formId}-name`} className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
          Program Name
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          value={plan.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="demo-input font-display font-medium text-sm"
          placeholder="e.g. Strength Training A"
          aria-label="Program Name"
        />
      </div>
      <div>
        <label htmlFor={`${formId}-days`} className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
          Target Days / Week
        </label>
        <input
          id={`${formId}-days`}
          type="number"
          min="1"
          max="7"
          value={plan.daysPerWeek}
          onChange={(e) =>
            onChange('daysPerWeek', Math.max(1, parseInt(e.target.value) || 1))
          }
          className="demo-input text-sm"
          aria-label="Target Days per Week"
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`${formId}-desc`} className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
          Description & Objectives
        </label>
        <textarea
          id={`${formId}-desc`}
          value={plan.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="demo-textarea text-xs"
          placeholder="Brief description of key target areas, cycles, or notes..."
        />
      </div>
    </div>
  )
}
