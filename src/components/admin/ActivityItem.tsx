import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { DEFAULT_ACTIVITY_DURATION } from '../../domain/plans'
import type { Activity, Media } from '../../domain/plans'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { MediaUpload } from './MediaUpload'

interface NumericFieldProps {
  value: number | undefined
  /** Snap-to value for invalid input on blur; null clears the field instead. */
  fallback: number | null
  unit: string
  placeholder: string
  onCommit: (value: string) => void
}

// Locally-controlled numeric input: keystrokes stay local so intermediate or
// invalid values don't fight the parent. On blur an invalid value snaps to
// the fallback, or is cleared when the field is optional (fallback null).
function NumericField({
  value,
  fallback,
  unit,
  placeholder,
  onCommit,
}: NumericFieldProps) {
  const [local, setLocal] = useState(
    value !== undefined ? value.toString() : '',
  )

  useEffect(() => {
    setLocal(value !== undefined ? value.toString() : '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocal(val)
    const parsed = parseInt(val)
    if (!isNaN(parsed) && parsed > 0) onCommit(parsed.toString())
  }

  const handleBlur = () => {
    const parsed = parseInt(local)
    if (!isNaN(parsed) && parsed > 0) {
      setLocal(parsed.toString())
      onCommit(parsed.toString())
    } else if (fallback === null) {
      setLocal('')
      onCommit('')
    } else {
      setLocal(fallback.toString())
      onCommit(fallback.toString())
    }
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
        aria-label={placeholder}
      />
      <span className="absolute right-2 top-2 text-3xs text-ink-soft font-mono">
        {unit}
      </span>
    </div>
  )
}

interface ActivityActionsProps {
  index: number
  onDeleteActivity: (index: number) => void
}

function ActivityActions({ index, onDeleteActivity }: ActivityActionsProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={() => onDeleteActivity(index)}
        className="demo-button demo-button-icon border-danger/30 bg-danger/10 text-danger hover:bg-danger/20"
        title="Delete Activity"
        aria-label="Delete Activity"
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
  const isLearning = type === 'learning'
  const badgeClass = `px-1.5 py-0.5 rounded text-4xs uppercase font-black tracking-wider ${
    isRest
      ? 'bg-sky-500/10 text-sky-600 border border-sky-500/30 dark:text-sky-400'
      : isLearning
        ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30 dark:text-purple-400'
        : 'bg-lagoon/10 text-lagoon-deep border border-lagoon/30'
  }`
  return (
    <div className="flex items-center gap-1.5 sm:w-28 flex-shrink-0">
      <span className={badgeClass}>{type}</span>
      <span className="text-2xs text-ink-soft font-mono font-bold">
        #{index + 1}
      </span>
    </div>
  )
}

interface ActivityInputsProps {
  activity: Activity
  index: number
  onActivityChange: (
    index: number,
    field: keyof Activity,
    value: string | Media[],
  ) => void
}

function ActivityInputs({
  activity,
  index,
  onActivityChange,
}: ActivityInputsProps) {
  const isRest = activity.type === 'rest'
  const isLearning = activity.type === 'learning'

  return (
    <div className="flex-grow min-w-0 flex flex-col gap-2">
      {/* Line 1: Name & Duration */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-8 sm:col-span-9">
          <input
            type="text"
            value={activity.name}
            onChange={(e) => onActivityChange(index, 'name', e.target.value)}
            className="demo-input py-1.5 px-2.5 text-xs font-semibold"
            placeholder="Activity / Rest Name"
            aria-label="Activity / Rest Name"
          />
        </div>

        <div className="col-span-4 sm:col-span-3">
          <NumericField
            value={activity.duration}
            fallback={DEFAULT_ACTIVITY_DURATION}
            unit="s"
            placeholder="Sec"
            onCommit={(v) => onActivityChange(index, 'duration', v)}
          />
        </div>
      </div>

      {/* Line 2: Specific fields (exercise sets/reps/weight or learning description) */}
      {isLearning ? (
        <div className="w-full">
          <input
            type="text"
            value={activity.description ?? ''}
            onChange={(e) =>
              onActivityChange(index, 'description', e.target.value)
            }
            className="demo-input py-1.5 px-2.5 text-xs"
            placeholder="Instruction / learning details"
            aria-label="Instruction / learning details"
          />
        </div>
      ) : !isRest ? (
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-4">
            <NumericField
              value={activity.sets}
              fallback={null}
              unit="x"
              placeholder="Sets"
              onCommit={(v) => onActivityChange(index, 'sets', v)}
            />
          </div>
          <div className="col-span-4">
            <input
              type="text"
              value={activity.reps ?? ''}
              onChange={(e) => onActivityChange(index, 'reps', e.target.value)}
              className="demo-input py-1.5 px-2 text-xs text-center font-mono"
              placeholder="Reps"
              aria-label="Reps"
            />
          </div>
          <div className="col-span-4">
            <input
              type="text"
              value={activity.weight ?? ''}
              onChange={(e) =>
                onActivityChange(index, 'weight', e.target.value)
              }
              className="demo-input py-1.5 px-2 text-xs text-center font-mono"
              placeholder="Weight"
              aria-label="Weight"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface ActivityItemProps {
  activity: Activity
  index: number
  isFirst?: boolean
  isLast?: boolean
  onActivityChange: (
    index: number,
    field: keyof Activity,
    value: string | Media[],
  ) => void
  onMoveActivity?: (index: number, direction: 'up' | 'down') => void
  onDeleteActivity: (index: number) => void
}

export function ActivityItem({
  activity,
  index,
  onActivityChange,
  onDeleteActivity,
}: ActivityItemProps) {
  const reducedMotion = usePrefersReducedMotion()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

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
      : activity.type === 'learning'
        ? 'border-purple-500/20 bg-purple-500/[0.02] dark:border-purple-500/30'
        : 'border-line bg-lagoon/[0.03]'
  }`

  return (
    <div ref={setNodeRef} style={style} className={containerClass}>
      <div className="flex flex-row items-start gap-2.5 w-full">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="demo-button demo-button-icon flex-shrink-0 mt-1 touch-none cursor-grab active:cursor-grabbing border-line bg-chip text-ink-soft hover:text-ink"
          title="Drag to reorder"
          aria-label={`Reorder activity ${index + 1}: ${activity.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-shrink-0 mt-1 hidden sm:block">
          <ActivityItemBadge type={activity.type} index={index} />
        </div>
        <ActivityInputs
          activity={activity}
          index={index}
          onActivityChange={onActivityChange}
        />
        <div className="flex-shrink-0 mt-1">
          <ActivityActions index={index} onDeleteActivity={onDeleteActivity} />
        </div>
      </div>

      {/* Small badge visible on mobile under top bar or inside item */}
      <div className="sm:hidden -mt-1 flex items-center">
        <ActivityItemBadge type={activity.type} index={index} />
      </div>

      {activity.type === 'exercise' && (
        <div className="w-full border-t border-line/35 pt-2.5 sm:pl-10">
          <span className="text-3xs font-semibold text-ink-soft uppercase tracking-wider block mb-1">
            Activity Media (Images / Videos)
          </span>
          <MediaUpload
            media={activity.media}
            onChange={(m) => onActivityChange(index, 'media', m)}
            activityName={activity.name}
            activityDescription={activity.description}
          />
        </div>
      )}
    </div>
  )
}
