import { formatTime } from '../../utils/time'

type ActivityType = 'exercise' | 'rest' | 'learning' | undefined

interface ProgressCircleProps {
  radius: number
  circumference: number
  strokeDashoffset: number
  type: ActivityType
  isCompleted: boolean
  secondsRemaining: number
  currentActivityIndex: number
  totalActivities: number
}

function getProgressCircleTheme(type: ActivityType | 'done') {
  const base =
    type === 'done'
      ? 'var(--success)'
      : type === 'rest'
        ? 'var(--rest)'
        : type === 'learning'
          ? 'var(--learning)'
          : 'var(--lagoon)'
  return {
    strokeColor: base,
    shadowColor: `color-mix(in oklab, ${base} 35%, transparent)`,
  }
}

function getProgressCircleStatus(isCompleted: boolean, type: ActivityType) {
  if (isCompleted) return 'DONE'
  if (type === 'rest') return 'REST'
  if (type === 'learning') return 'LEARNING'
  return 'WORK'
}

export function ProgressCircle({
  radius,
  circumference,
  strokeDashoffset,
  type,
  isCompleted,
  secondsRemaining,
  currentActivityIndex,
  totalActivities,
}: ProgressCircleProps) {
  const { strokeColor, shadowColor } = getProgressCircleTheme(
    isCompleted ? 'done' : type,
  )
  const statusText = getProgressCircleStatus(isCompleted, type)
  const timeText = isCompleted ? '00:00' : formatTime(secondsRemaining)

  return (
    <div className="relative w-full max-w-72 aspect-square mx-auto flex items-center justify-center select-none">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 240 240">
        <circle
          cx="120"
          cy="120"
          r={radius}
          className="fill-none stroke-ink/10"
          strokeWidth="10"
        />
        <circle
          cx="120"
          cy="120"
          r={radius}
          className="fill-none transition-all duration-1000 ease-linear"
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${shadowColor})`,
          }}
        />
      </svg>

      <div className="text-center flex flex-col items-center justify-center gap-1.5 z-10">
        <span
          className="text-xxs tracking-widest-plus font-black uppercase transition-colors duration-500"
          style={{ color: strokeColor }}
        >
          {statusText}
        </span>

        <span
          className="font-display text-6xl font-black tracking-tighter text-ink leading-none tabular-nums"
          role="timer"
          aria-live="off"
        >
          {timeText}
        </span>

        <span className="text-xxs text-ink-soft font-semibold tabular-nums px-2.5 py-0.5 border border-line bg-chip/40 rounded-full">
          Step {currentActivityIndex + 1} of {totalActivities}
        </span>
      </div>
    </div>
  )
}
