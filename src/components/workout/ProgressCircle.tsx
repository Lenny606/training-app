import { formatTime } from '../../utils/time'

interface ProgressCircleProps {
  radius: number
  circumference: number
  strokeDashoffset: number
  type: 'exercise' | 'rest' | 'learning' | undefined
  isCompleted: boolean
  secondsRemaining: number
  currentActivityIndex: number
  totalActivities: number
}

function getProgressCircleTheme(
  type: 'exercise' | 'rest' | 'learning' | undefined,
) {
  if (type === 'rest') {
    return {
      strokeColor: 'var(--palm)',
      shadowColor: 'color-mix(in oklab, var(--palm) 35%, transparent)',
    }
  }
  if (type === 'learning') {
    return {
      strokeColor: '#a855f7', // purple-500
      shadowColor: 'color-mix(in oklab, #a855f7 35%, transparent)',
    }
  }
  const base = 'var(--lagoon)'
  return {
    strokeColor: base,
    shadowColor: `color-mix(in oklab, ${base} 35%, transparent)`,
  }
}

function getProgressCircleStatus(
  isCompleted: boolean,
  type: 'exercise' | 'rest' | 'learning' | undefined,
) {
  if (isCompleted) return 'DONE'
  if (type === 'rest') return 'REST INTERVAL'
  if (type === 'learning') return 'LEARNING'
  return 'SET WORK'
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
  const { strokeColor, shadowColor } = getProgressCircleTheme(type)
  const statusText = getProgressCircleStatus(isCompleted, type)
  const timeText = isCompleted ? '00:00' : formatTime(secondsRemaining)

  return (
    <div className="relative w-full max-w-64 aspect-square mx-auto flex items-center justify-center select-none">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 240 240">
        <circle
          cx="120"
          cy="120"
          r={radius}
          className="stroke-line fill-none stroke-[8]"
        />
        <circle
          cx="120"
          cy="120"
          r={radius}
          className="fill-none stroke-[8] transition-all duration-1000 ease-linear"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${shadowColor})`,
          }}
        />
      </svg>

      <div className="text-center flex flex-col items-center justify-center z-10">
        <span className="text-[10px] tracking-[0.25em] font-black uppercase text-ink-soft mb-0.5">
          {statusText}
        </span>

        <span className="font-display text-5xl font-black tracking-tighter text-ink leading-none select-all">
          {timeText}
        </span>

        <span className="text-[10px] text-ink-soft font-mono mt-1 px-2.5 py-0.5 border border-line bg-chip/40 rounded-full">
          Step {currentActivityIndex + 1} of {totalActivities}
        </span>
      </div>
    </div>
  )
}
