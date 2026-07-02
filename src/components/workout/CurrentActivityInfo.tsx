import type { Activity } from '../../domain/plans'

interface CurrentActivityInfoProps {
  isCompleted: boolean
  planName: string
  currentActivity: Activity | undefined
}

// fallow-ignore-next-line complexity
function ActivityMetadata({ activity }: { activity: Activity }) {
  if (activity.type !== 'exercise') return null
  
  const items = [
    activity.sets ? `${activity.sets} Sets` : '',
    activity.reps ? `${activity.reps} Reps` : '',
    activity.weight || ''
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-1.5">
      {items.map((text, idx) => (
        <span key={idx} className="demo-pill text-[10px] py-0.5 px-2">
          {text}
        </span>
      ))}
    </div>
  )
}

export function CurrentActivityInfo({
  isCompleted,
  planName,
  currentActivity,
}: CurrentActivityInfoProps) {
  if (isCompleted) {
    return (
      <div className="flex flex-col gap-1 items-center">
        <h2 className="m-0 font-display text-xl font-extrabold text-lagoon animate-bounce">
          Session Complete!
        </h2>
        <p className="text-xs text-ink-soft m-0">
          Excellent work completing the {planName} routine.
        </p>
      </div>
    )
  }

  if (!currentActivity) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] tracking-widest font-black uppercase text-lagoon">
        CURRENT ACTIVITY
      </span>
      <h2 className="m-0 font-display text-xl font-black text-ink">
        {currentActivity.name}
      </h2>
      <ActivityMetadata activity={currentActivity} />
    </div>
  )
}
