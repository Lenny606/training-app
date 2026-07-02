import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Calendar, GripVertical, Layers } from 'lucide-react'
import type { TrainingPlan } from '../../domain/plans'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

interface PlansSidebarProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  onSelectPlan: (id: string) => void
  onCreateNewPlan: () => void
  onDeletePlan: (id: string) => void
  onReorderPlans: (from: number, to: number) => void
}

interface SidebarItemProps {
  plan: TrainingPlan
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function SidebarItem({ plan, isSelected, onSelect, onDelete }: SidebarItemProps) {
  const reducedMotion = usePrefersReducedMotion()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })
  const exerciseCount = plan.activities.filter((a) => a.type === 'exercise').length

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(plan.id)}
      className={`demo-list-item cursor-pointer flex flex-col gap-1 transition-all ${
        isSelected
          ? 'border-lagoon-deep bg-[rgba(0,240,255,0.06)] shadow-[0_0_12px_rgba(0,240,255,0.08)]'
          : 'hover:border-[rgba(0,240,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="demo-button demo-button-icon flex-shrink-0 min-h-11 min-w-11 touch-none cursor-grab active:cursor-grabbing border-line bg-chip text-ink-soft hover:text-ink"
            title="Drag to reorder"
            aria-label={`Reorder plan: ${plan.name}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h3 className="m-0 text-sm font-semibold text-ink truncate">
            {plan.name}
          </h3>
        </div>
        <span className="demo-pill px-2 py-0.5 text-[10px] flex-shrink-0">
          {exerciseCount} ex
        </span>
      </div>
      <p className="text-xs text-ink-soft m-0 line-clamp-2">
        {plan.description || 'No description provided.'}
      </p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-ink-soft">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-lagoon-deep" />
          {plan.daysPerWeek} days/wk
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(plan.id)
          }}
          className="demo-button demo-button-icon border-red-950/50 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:text-red-300"
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
  onReorderPlans,
}: PlansSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = plans.findIndex((p) => p.id === active.id)
    const to = plans.findIndex((p) => p.id === over.id)
    if (from !== -1 && to !== -1) onReorderPlans(from, to)
  }

  return (
    <section className="w-full lg:w-80 flex-shrink-0">
      <div className="demo-panel p-5 rise-in h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
            <Layers className="h-5 w-5 text-lagoon" />
            Training Programs
          </h2>
          <button
            onClick={onCreateNewPlan}
            className="demo-button demo-button-sm bg-[rgba(0,240,255,0.15)] text-lagoon border-[rgba(0,240,255,0.3)] flex items-center gap-1"
            title="Create New Plan"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        <p className="text-xs text-ink-soft m-0">
          Select a plan to configure activities, sets, weights, and durations.
        </p>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] lg:max-h-[640px] pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={plans.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {plans.map((p) => (
                <SidebarItem
                  key={p.id}
                  plan={p}
                  isSelected={p.id === selectedPlanId}
                  onSelect={onSelectPlan}
                  onDelete={onDeletePlan}
                />
              ))}
            </SortableContext>
          </DndContext>

          {plans.length === 0 && (
            <div className="text-center py-8 border border-dashed border-line rounded-xl">
              <p className="text-xs text-ink-soft mb-3">No plans found</p>
              <button onClick={onCreateNewPlan} className="demo-button demo-button-sm">
                Create your first plan
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
