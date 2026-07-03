import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUp, ArrowDown, GripVertical, Trash2 } from 'lucide-react'
import type { Activity, Media } from '../../domain/plans'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { MediaUpload } from './MediaUpload'

interface NumericFieldProps {
  value: number | undefined
  fallback: number
  unit: string
  placeholder: string
  onCommit: (value: number) => void
}

// Locally-controlled numeric input: keystrokes stay local so intermediate or
// invalid values don't fight the parent, and an invalid value snaps to the
// fallback on blur.
function NumericField({ value, fallback, unit, placeholder, onCommit }: NumericFieldProps) {
  const [local, setLocal] = useState(value !== undefined ? value.toString() : '')

  useEffect(() => {
    setLocal(value !== undefined ? value.toString() : '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocal(val)
    const parsed = parseInt(val)
    if (!isNaN(parsed) && parsed > 0) onCommit(parsed)
  }

  const handleBlur = () => {
    const parsed = parseInt(local)
    const next = !isNaN(parsed) && parsed > 0 ? parsed : fallback
    setLocal(next.toString())
    onCommit(next)
  }

  return (
    <div className="relative">
      <input
        type="number"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        className="demo-input py-1.5 pl-2.5 pr-6 text-xs text-right font-mono"
        placeholder={placeholder}
      />
      <span className="absolute right-2 top-2 text-[9px] text-ink-soft font-mono">
        {unit}
      </span>
    </div>
  )
}

interface ExerciseFieldsProps {
  activity: Activity
  index: number
  onActivityChange: (index: number, field: keyof Activity, value: string | Media[]) => void
}

function ExerciseFields({ activity, index, onActivityChange }: ExerciseFieldsProps) {
  return (
    <>
      <div className="col-span-4 sm:col-span-2">
        <NumericField
          value={activity.sets}
          fallback={3}
          unit="x"
          placeholder="Sets"
          onCommit={(v) => onActivityChange(index, 'sets', v.toString())}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <input
          type="text"
          value={activity.reps ?? ''}
          onChange={(e) => onActivityChange(index, 'reps', e.target.value)}
          className="demo-input py-1.5 px-2 text-xs text-center font-mono"
          placeholder="Reps"
        />
      </div>
      <div className="col-span-12 sm:col-span-2">
        <input
          type="text"
          value={activity.weight ?? ''}
          onChange={(e) => onActivityChange(index, 'weight', e.target.value)}
          className="demo-input py-1.5 px-2 text-xs text-center font-mono"
          placeholder="Weight"
        />
      </div>
    </>
  )
}

interface ActivityActionsProps {
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveActivity: (index: number, direction: 'up' | 'down') => void
  onDeleteActivity: (index: number) => void
}

function ActivityActions({
  index,
  isFirst,
  isLast,
  onMoveActivity,
  onDeleteActivity,
}: ActivityActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:self-center self-end mt-2 sm:mt-0">
      <button
        onClick={() => onMoveActivity(index, 'up')}
        disabled={isFirst}
        className="demo-button demo-button-icon border-line bg-chip text-ink-soft hover:text-ink disabled:opacity-30 disabled:hover:text-ink-soft"
        title="Move Activity Up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onMoveActivity(index, 'down')}
        disabled={isLast}
        className="demo-button demo-button-icon border-line bg-chip text-ink-soft hover:text-ink disabled:opacity-30 disabled:hover:text-ink-soft"
        title="Move Activity Down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDeleteActivity(index)}
        className="demo-button demo-button-icon ml-1 border-danger/30 bg-danger/10 text-danger hover:bg-danger/20"
        title="Delete Activity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface ActivityItemBadgeProps {
  type: string
  index: number
}

function ActivityItemBadge({ type, index }: ActivityItemBadgeProps) {
  const isRest = type === 'rest'
  const badgeClass = `px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${
    isRest
      ? 'bg-sky-500/10 text-sky-600 border border-sky-500/30 dark:text-sky-400'
      : 'bg-lagoon/10 text-lagoon-deep border border-lagoon/30'
  }`
  return (
    <div className="flex items-center gap-2 sm:w-28 flex-shrink-0">
      <span className={badgeClass}>
        {type}
      </span>
      <span className="text-xs text-ink-soft font-mono font-bold">
        #{index + 1}
      </span>
    </div>
  )
}

interface ActivityInputsProps {
  activity: Activity
  index: number
  onActivityChange: (index: number, field: keyof Activity, value: string | Media[]) => void
}

function ActivityInputs({ activity, index, onActivityChange }: ActivityInputsProps) {
  const isRest = activity.type === 'rest'

  return (
    <div className="flex-grow min-w-0 grid gap-2 grid-cols-12">
      <div className="col-span-12 sm:col-span-4">
        <input
          type="text"
          value={activity.name}
          onChange={(e) => onActivityChange(index, 'name', e.target.value)}
          className="demo-input py-1.5 px-2.5 text-xs font-semibold"
          placeholder="Activity / Rest Name"
        />
      </div>

      <div className="col-span-4 sm:col-span-2">
        <NumericField
          value={activity.duration}
          fallback={120}
          unit="s"
          placeholder="Sec"
          onCommit={(v) => onActivityChange(index, 'duration', v.toString())}
        />
      </div>

      {!isRest ? (
        <ExerciseFields
          activity={activity}
          index={index}
          onActivityChange={onActivityChange}
        />
      ) : (
        <div className="col-span-12 sm:col-span-8 flex items-center text-xs text-ink-soft italic px-2">
          Rest Period — No sets, reps or weight tracking needed.
        </div>
      )}
    </div>
  )
}

interface ActivityItemProps {
  activity: Activity
  index: number
  isFirst: boolean
  isLast: boolean
  onActivityChange: (index: number, field: keyof Activity, value: string | Media[]) => void
  onMoveActivity: (index: number, direction: 'up' | 'down') => void
  onDeleteActivity: (index: number) => void
}

export function ActivityItem({
  activity,
  index,
  isFirst,
  isLast,
  onActivityChange,
  onMoveActivity,
  onDeleteActivity,
}: ActivityItemProps) {
  const reducedMotion = usePrefersReducedMotion()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id })

  const isRest = activity.type === 'rest'
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 1 : undefined,
  }
  const containerClass = `demo-list-item flex flex-col gap-3 p-3 border transition-all ${
    isRest
      ? 'border-line/50'
      : 'border-line bg-lagoon/[0.03]'
  }`

  return (
    <div ref={setNodeRef} style={style} className={containerClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="demo-button demo-button-icon flex-shrink-0 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 touch-none cursor-grab active:cursor-grabbing border-line bg-chip text-ink-soft hover:text-ink"
          title="Drag to reorder"
          aria-label={`Reorder activity ${index + 1}: ${activity.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <ActivityItemBadge type={activity.type} index={index} />
        <ActivityInputs
          activity={activity}
          index={index}
          onActivityChange={onActivityChange}
        />
        <ActivityActions
          index={index}
          isFirst={isFirst}
          isLast={isLast}
          onMoveActivity={onMoveActivity}
          onDeleteActivity={onDeleteActivity}
        />
      </div>

      {!isRest && (
        <div className="w-full border-t border-line/35 pt-2.5 sm:pl-10">
          <span className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider block mb-1">
            Activity Media (Images / Videos)
          </span>
          <MediaUpload
            media={activity.media}
            onChange={(m) => onActivityChange(index, 'media', m)}
          />
        </div>
      )}
    </div>
  )
}
