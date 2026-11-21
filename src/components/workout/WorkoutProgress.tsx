import type { Activity } from '../../domain/plans'
import { formatTime } from '../../utils/time'

interface WorkoutProgressProps {
  planName: string
  activities: Activity[]
  currentActivityIndex: number
  secondsRemaining: number
  isCompleted: boolean
}

const SEGMENT_FILL: Record<Activity['type'], string> = {
  exercise: 'bg-lagoon',
  rest: 'bg-rest',
  learning: 'bg-learning',
}

function getSegmentFill(
  index: number,
  currentActivityIndex: number,
  secondsRemaining: number,
  duration: number,
  isCompleted: boolean,
) {
  if (isCompleted || index < currentActivityIndex) return 1
  if (index > currentActivityIndex) return 0
  return Math.max(0, Math.min(1, 1 - secondsRemaining / (duration || 1)))
}

/**
 * Whole-workout position: one segment per activity, sized by its duration, so
 * the bar shows both how far along the session is and what kind of block
 * (work / rest / learning) comes next.
 */
export function WorkoutProgress({
  planName,
  activities,
  currentActivityIndex,
  secondsRemaining,
  isCompleted,
}: WorkoutProgressProps) {
  const total = activities.reduce((sum, a) => sum + a.duration, 0)
  const upcoming = activities
    .slice(currentActivityIndex + 1)
    .reduce((sum, a) => sum + a.duration, 0)
  const remaining = isCompleted ? 0 : upcoming + Math.max(0, secondsRemaining)
  const percent =
    total > 0 ? Math.round(((total - remaining) / total) * 100) : 0

  return (
    <div className="z-10 flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-display text-sm font-bold text-ink">
          {planName}
        </span>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-ink-soft">
          {isCompleted ? 'Done' : `${formatTime(remaining)} left`}
        </span>
      </div>
      <div
        className="flex h-1.5 w-full gap-0.5"
        role="progressbar"
        aria-label="Workout progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        {activities.map((activity, index) => {
          const fill = getSegmentFill(
            index,
            currentActivityIndex,
            secondsRemaining,
            activity.duration,
            isCompleted,
          )
          return (
            <div
              key={activity.id}
              className="h-full min-w-0.5 overflow-hidden rounded-full bg-ink/10"
              style={{ flex: `${Math.max(activity.duration, 1)} 1 0` }}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${SEGMENT_FILL[activity.type]}`}
                style={{ width: `${fill * 100}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
