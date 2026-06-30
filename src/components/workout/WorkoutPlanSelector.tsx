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
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4 text-[var(--lagoon)]" />
          Training Plan
        </label>
        
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg border transition-all ${
            soundEnabled
              ? 'border-[var(--line)] bg-[rgba(0,240,255,0.06)] text-[var(--lagoon)]'
              : 'border-transparent bg-transparent text-[var(--sea-ink-soft)]'
          }`}
          title={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={selectedPlanId}
          onChange={(e) => onPlanChange(e.target.value)}
          className="demo-select font-display font-bold text-sm bg-slate-900/90 text-white flex-grow cursor-pointer"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <Link
          to="/admin"
          className="demo-button demo-button-secondary p-2.5 rounded-xl border border-[var(--line)] hover:bg-[rgba(0,240,255,0.06)] text-[var(--sea-ink)] flex items-center justify-center"
          title="Configure Plans"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
