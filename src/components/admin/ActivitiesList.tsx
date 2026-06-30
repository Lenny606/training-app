import { ActivityItem } from './ActivityItem'
import type { Activity } from '../../domain/plans'

interface ActivitiesListProps {
  activities: Activity[]
  onActivityChange: (index: number, field: keyof Activity, value: any) => void
  onMoveActivity: (index: number, direction: 'up' | 'down') => void
  onDeleteActivity: (index: number) => void
}

export function ActivitiesList({
  activities,
  onActivityChange,
  onMoveActivity,
  onDeleteActivity,
}: ActivitiesListProps) {
  return (
    <div className="flex flex-col gap-2">
      {activities.map((act, index) => (
        <ActivityItem
          key={act.id}
          activity={act}
          index={index}
          isFirst={index === 0}
          isLast={index === activities.length - 1}
          onActivityChange={onActivityChange}
          onMoveActivity={onMoveActivity}
          onDeleteActivity={onDeleteActivity}
        />
      ))}

      {activities.length === 0 && (
        <div className="text-center py-6 border border-dashed border-[var(--line)] rounded-xl text-xs text-[var(--sea-ink-soft)]">
          No activities added yet. Add one below to get started.
        </div>
      )}
    </div>
  )
}
