import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, ImageIcon, Trash2 } from 'lucide-react'
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
  ariaLabel?: string
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
  ariaLabel,
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
        aria-label={ariaLabel || placeholder}
      />
      <span className="absolute right-2 top-2 text-3xs text-ink-soft font-mono">
        {unit}
      </span>
    </div>
  )
}

interface ActivityActionsProps {
  index: number
  activityName: string
  onDeleteActivity: (index: number) => void
}

function ActivityActions({
  index,
  activityName,
  onDeleteActivity,
}: ActivityActionsProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={() => {
          if (window.confirm(`Delete "${activityName}"?`)) {
            onDeleteActivity(index)
          }
        }}
        className="demo-button demo-button-icon border-transparent bg-transparent text-ink-soft hover:text-danger hover:bg-danger/10 focus-visible:ring-2 focus-visible:outline-none"
        title="Delete activity"
        aria-label={`Delete activity: ${activityName || 'Unnamed Activity'}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
            placeholder="Name"
            aria-label={`Activity Name: ${activity.name || 'Unnamed Activity'}`}
          />
        </div>

        <div className="col-span-4 sm:col-span-3">
          <NumericField
            value={activity.duration}
            fallback={DEFAULT_ACTIVITY_DURATION}
            unit="s"
            placeholder="Sec"
            ariaLabel={`Duration in seconds: ${activity.name || 'Unnamed Activity'}`}
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
            placeholder="Details"
            aria-label={`Instruction details: ${activity.name || 'Unnamed Activity'}`}
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
              ariaLabel={`Number of sets: ${activity.name || 'Unnamed Activity'}`}
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
              aria-label={`Number of reps: ${activity.name || 'Unnamed Activity'}`}
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
              aria-label={`Weight amount: ${activity.name || 'Unnamed Activity'}`}
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
  const [mediaOpen, setMediaOpen] = useState(false)
  const mediaCount = activity.media?.length ?? 0
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
  const containerClass = `demo-list-item flex flex-col gap-2 p-2.5 border transition-all ${
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
          className="demo-button demo-button-icon flex-shrink-0 mt-1 touch-none cursor-grab active:cursor-grabbing border-line bg-chip text-ink-soft hover:text-ink focus-visible:ring-2 focus-visible:outline-none"
          title="Drag to reorder"
          aria-label={`Reorder activity ${index + 1}: ${activity.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-shrink-0 mt-2.5 w-5 text-right text-2xs text-ink-soft font-mono font-bold">
          {index + 1}
        </span>
        <ActivityInputs
          activity={activity}
          index={index}
          onActivityChange={onActivityChange}
        />
        {activity.type === 'exercise' && (
          <button
            type="button"
            onClick={() => setMediaOpen((o) => !o)}
            className="demo-button demo-button-icon flex-shrink-0 mt-1 gap-0.5 border-transparent bg-transparent text-ink-soft hover:text-ink focus-visible:ring-2 focus-visible:outline-none"
            title="Media"
            aria-expanded={mediaOpen}
            aria-label={`Media for ${activity.name || 'Unnamed Activity'}`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {mediaCount > 0 && <span className="text-2xs">{mediaCount}</span>}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${mediaOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        <div className="flex-shrink-0 mt-1">
          <ActivityActions
            index={index}
            activityName={activity.name || 'Unnamed Activity'}
            onDeleteActivity={onDeleteActivity}
          />
        </div>
      </div>

      {activity.type === 'exercise' && mediaOpen && (
        <div className="w-full border-t border-line/35 pt-2 sm:pl-10">
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
