import { Plus, Trash2, Calendar, Layers } from 'lucide-react'
import type { TrainingPlan } from '../../domain/plans'

interface PlansSidebarProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  onSelectPlan: (id: string) => void
  onCreateNewPlan: () => void
  onDeletePlan: (id: string) => void
}

interface SidebarItemProps {
  plan: TrainingPlan
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function SidebarItem({ plan, isSelected, onSelect, onDelete }: SidebarItemProps) {
  const exerciseCount = plan.activities.filter((a) => a.type === 'exercise').length
  
  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`demo-list-item cursor-pointer flex flex-col gap-1 transition-all ${
        isSelected
          ? 'border-[var(--lagoon-deep)] bg-[rgba(0,240,255,0.06)] shadow-[0_0_12px_rgba(0,240,255,0.08)]'
          : 'hover:border-[rgba(0,240,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)] truncate max-w-[160px]">
          {plan.name}
        </h3>
        <span className="demo-pill px-2 py-0.5 text-[10px]">
          {exerciseCount} ex
        </span>
      </div>
      <p className="text-xs text-[var(--sea-ink-soft)] m-0 line-clamp-2">
        {plan.description || 'No description provided.'}
      </p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-[var(--sea-ink-soft)]">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-[var(--lagoon-deep)]" />
          {plan.daysPerWeek} days/wk
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(plan.id)
          }}
          className="text-red-400 hover:text-red-300 p-0.5 hover:bg-white/5 rounded"
          title="Delete Plan"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function PlansSidebar({
  plans,
  selectedPlanId,
  onSelectPlan,
  onCreateNewPlan,
  onDeletePlan,
}: PlansSidebarProps) {
  return (
    <section className="w-full lg:w-80 flex-shrink-0">
      <div className="demo-panel p-5 rise-in h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--sea-ink)] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--lagoon)]" />
            Training Programs
          </h2>
          <button
            onClick={onCreateNewPlan}
            className="demo-button p-2 text-xs flex items-center gap-1 bg-[rgba(0,240,255,0.15)] text-[var(--lagoon)] border-[rgba(0,240,255,0.3)]"
            title="Create New Plan"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </button>
        </div>
        
        <p className="text-xs text-[var(--sea-ink-soft)] m-0">
          Select a plan to configure activities, sets, weights, and durations.
        </p>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] lg:max-h-[640px] pr-1">
          {plans.map((p) => (
            <SidebarItem
              key={p.id}
              plan={p}
              isSelected={p.id === selectedPlanId}
              onSelect={onSelectPlan}
              onDelete={onDeletePlan}
            />
          ))}

          {plans.length === 0 && (
            <div className="text-center py-8 border border-dashed border-[var(--line)] rounded-xl">
              <p className="text-xs text-[var(--sea-ink-soft)] mb-3">No plans found</p>
              <button onClick={onCreateNewPlan} className="demo-button text-xs py-1.5 px-3">
                Create your first plan
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
