import { BookOpen, Coffee, Dumbbell, Flag } from 'lucide-react'
import type { Activity } from '../../domain/plans'
import { formatTime } from '../../utils/time'

interface NextActivityCardProps {
  nextActivity: Activity | undefined
  isCompleted: boolean
}

const TYPE_META = {
  exercise: {
    label: 'Exercise',
    icon: Dumbbell,
    tone: 'bg-lagoon/10 text-lagoon-deep',
  },
  rest: { label: 'Rest', icon: Coffee, tone: 'bg-rest/10 text-rest' },
  learning: {
    label: 'Learning',
    icon: BookOpen,
    tone: 'bg-learning/10 text-learning',
  },
} as const

function getNextActivityCardDetails(nextActivity: Activity | undefined) {
  if (!nextActivity) {
    return {
      headingText: 'Last one',
      subText: 'Finish this and the session is done.',
      icon: Flag,
      tone: 'bg-chip text-ink-soft',
    }
  }
  const meta = TYPE_META[nextActivity.type]
  const load =
    nextActivity.type === 'exercise'
      ? [
          nextActivity.sets ? `${nextActivity.sets} sets` : '',
          nextActivity.reps ? `${nextActivity.reps} reps` : '',
          nextActivity.weight || '',
        ].filter(Boolean)
      : []
  // A rest block is usually just named "Rest" — repeating the type under it
  // adds nothing.
  const sameAsName =
    nextActivity.name.trim().toLowerCase() === meta.label.toLowerCase()
  return {
    headingText: nextActivity.name,
    subText: load.length > 0 ? load.join(' · ') : sameAsName ? '' : meta.label,
    icon: meta.icon,
    tone: meta.tone,
  }
}

export function NextActivityCard({
  nextActivity,
  isCompleted,
}: NextActivityCardProps) {
  if (isCompleted) return null

  const {
    headingText,
    subText,
    icon: Icon,
    tone,
  } = getNextActivityCardDetails(nextActivity)

  return (
    <section className="demo-card rise-in flex items-center gap-3">
      <span
        className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-grow flex-col gap-0.5">
        <span className="text-2xs uppercase tracking-widest font-black text-ink-soft">
          Next up
        </span>
        <h3 className="m-0 truncate font-display text-base font-bold leading-tight text-ink">
          {headingText}
        </h3>
        {subText && <p className="m-0 text-xs text-ink-soft">{subText}</p>}
      </div>
      {nextActivity && (
        <span className="flex-shrink-0 rounded-full border border-line bg-chip/60 px-2.5 py-1 text-xs font-bold tabular-nums text-ink-soft">
          {formatTime(nextActivity.duration)}
        </span>
      )}
    </section>
  )
}
