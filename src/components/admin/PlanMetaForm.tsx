import { useId } from 'react'
import type { TrainingPlan } from '../../domain/plans'

interface PlanMetaFormProps {
  plan: TrainingPlan
  onChange: (field: keyof TrainingPlan, value: string | number) => void
}

export function PlanMetaForm({ plan, onChange }: PlanMetaFormProps) {
  const nameId = useId()
  const descId = useId()

  return (
    <div className="grid gap-3">
      <div>
        <label
          htmlFor={nameId}
          className="block text-2xs font-semibold text-ink-soft uppercase tracking-wider mb-1"
        >
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={plan.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="demo-input font-display font-medium text-sm"
          placeholder="e.g. Strength A"
        />
      </div>
      <div>
        <label
          htmlFor={descId}
          className="block text-2xs font-semibold text-ink-soft uppercase tracking-wider mb-1"
        >
          Description
        </label>
        <textarea
          id={descId}
          value={plan.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="demo-textarea text-xs"
          placeholder="Optional"
        />
      </div>
    </div>
  )
}
