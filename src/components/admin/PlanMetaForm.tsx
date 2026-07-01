import type { TrainingPlan } from '../../domain/plans'

interface PlanMetaFormProps {
  plan: TrainingPlan
  onChange: (field: keyof TrainingPlan, value: string | number) => void
}

export function PlanMetaForm({ plan, onChange }: PlanMetaFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
          Program Name
        </label>
        <input
          type="text"
          value={plan.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="demo-input font-display font-medium text-sm"
          placeholder="e.g. Strength Training A"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
          Target Days / Week
        </label>
        <input
          type="number"
          min="1"
          max="7"
          value={plan.daysPerWeek}
          onChange={(e) => onChange('daysPerWeek', Math.max(1, parseInt(e.target.value) || 1))}
          className="demo-input text-sm"
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
          Description & Objectives
        </label>
        <textarea
          value={plan.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="demo-textarea text-xs"
          placeholder="Brief description of key target areas, cycles, or notes..."
        />
      </div>
    </div>
  )
}
