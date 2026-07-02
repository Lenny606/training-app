import { Timer } from 'lucide-react'
import type { Activity } from '../../domain/plans'
import { formatTime } from '../../utils/time'

interface NextActivityCardProps {
  nextActivity: Activity | undefined
  isCompleted: boolean
}

function getNextActivityCardDetails(nextActivity: Activity | undefined) {
  if (!nextActivity) {
    return {
      headingText: 'Workout Finished',
      subText: 'Congratulations on completing your routine!',
    }
  }
  const typeText = nextActivity.type === 'rest' ? 'Rest Period' : 'Exercise Session'
  return {
    headingText: nextActivity.name,
    subText: `${typeText} — ${formatTime(nextActivity.duration)}`,
  }
}

export function NextActivityCard({ nextActivity, isCompleted }: NextActivityCardProps) {
  if (isCompleted) return null

  const { headingText, subText } = getNextActivityCardDetails(nextActivity)

  return (
    <section className="demo-card rise-in p-4 border border-line flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase tracking-widest font-black text-ink-soft">
          NEXT UP
        </span>
        <h3 className="m-0 font-display text-sm font-extrabold text-ink">
          {headingText}
        </h3>
        <p className="text-[11px] text-ink-soft m-0">
          {subText}
        </p>
      </div>
      {nextActivity && (
        <div className="flex-shrink-0 flex items-center gap-1 bg-lagoon/5 border border-line rounded-xl py-1.5 px-2.5 text-xs text-lagoon-deep">
          <Timer className="h-3.5 w-3.5" />
          <span className="font-mono font-bold">{nextActivity.duration}s</span>
        </div>
      )}
    </section>
  )
}
