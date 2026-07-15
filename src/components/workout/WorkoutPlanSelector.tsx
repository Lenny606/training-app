import { Link } from '@tanstack/react-router'
import { Dumbbell, Settings, Volume2, VolumeX } from 'lucide-react'
import type { TrainingPlan } from '../../domain/plans'

interface WorkoutPlanSelectorProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  soundEnabled: boolean
  onPlanChange: (planId: string) => void
  onToggleSound: () => void
}

export function WorkoutPlanSelector({
  plans,
  selectedPlanId,
  soundEnabled,
  onPlanChange,
  onToggleSound,
}: WorkoutPlanSelectorProps) {
  return (
    <section className="demo-panel p-4 rounded-2xl rise-in flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4 text-lagoon" />
          Training Plan
        </label>

        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg border transition-all ${
            soundEnabled
              ? 'border-line bg-lagoon/10 text-lagoon'
              : 'border-transparent bg-transparent text-ink-soft'
          }`}
          title={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
          aria-label={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={selectedPlanId}
          onChange={(e) => onPlanChange(e.target.value)}
          className="demo-select font-display font-bold text-sm flex-grow cursor-pointer"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <Link
          to="/admin"
          className="demo-button demo-button-secondary p-2.5 rounded-xl border border-line hover:bg-lagoon/10 text-ink flex items-center justify-center"
          title="Configure Plans"
          aria-label="Configure Plans"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
