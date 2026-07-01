import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import type { Activity } from '../../domain/plans'

interface ExerciseFieldsProps {
  activity: Activity
  index: number
  onActivityChange: (index: number, field: keyof Activity, value: string) => void
}

function ExerciseFields({ activity, index, onActivityChange }: ExerciseFieldsProps) {
  return (
    <>
      <div className="col-span-4 sm:col-span-2">
        <div className="relative">
          <input
            type="number"
            value={activity.sets ?? ''}
            onChange={(e) => onActivityChange(index, 'sets', e.target.value)}
            className="demo-input py-1.5 pl-2.5 pr-6 text-xs text-right font-mono"
            placeholder="Sets"
          />
          <span className="absolute right-2 top-2 text-[9px] text-[var(--sea-ink-soft)]">x</span>
        </div>
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
        className="demo-button demo-button-icon border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] disabled:opacity-30 disabled:hover:text-[var(--sea-ink-soft)]"
        title="Move Activity Up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onMoveActivity(index, 'down')}
        disabled={isLast}
        className="demo-button demo-button-icon border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] disabled:opacity-30 disabled:hover:text-[var(--sea-ink-soft)]"
        title="Move Activity Down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDeleteActivity(index)}
        className="demo-button demo-button-icon ml-1 border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300"
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
      ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
      : 'bg-cyan-950/60 text-[var(--lagoon)] border border-[rgba(0,240,255,0.2)]'
  }`
  return (
    <div className="flex items-center gap-2 sm:w-28 flex-shrink-0">
      <span className={badgeClass}>
        {type}
      </span>
      <span className="text-xs text-[var(--sea-ink-soft)] font-mono font-bold">
        #{index + 1}
      </span>
    </div>
  )
}

interface ActivityInputsProps {
  activity: Activity
  index: number
  onActivityChange: (index: number, field: keyof Activity, value: string) => void
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
        <div className="relative">
          <input
            type="number"
            value={activity.duration}
            onChange={(e) => onActivityChange(index, 'duration', e.target.value)}
            className="demo-input py-1.5 pl-2.5 pr-6 text-xs text-right font-mono"
            placeholder="Sec"
          />
          <span className="absolute right-2 top-2 text-[9px] text-[var(--sea-ink-soft)] font-mono">s</span>
        </div>
      </div>

      {!isRest ? (
        <ExerciseFields
          activity={activity}
          index={index}
          onActivityChange={onActivityChange}
        />
      ) : (
        <div className="col-span-12 sm:col-span-8 flex items-center text-xs text-[var(--sea-ink-soft)] italic px-2">
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
  onActivityChange: (index: number, field: keyof Activity, value: string) => void
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
  const isRest = activity.type === 'rest'
  const containerClass = `demo-list-item flex flex-col gap-3 sm:flex-row sm:items-center p-3 border transition-all ${
    isRest
      ? 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]'
      : 'border-[var(--line)] bg-[rgba(0,240,255,0.01)]'
  }`

  return (
    <div className={containerClass}>
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
  )
}
