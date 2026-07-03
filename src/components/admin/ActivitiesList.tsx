import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ActivityItem } from './ActivityItem'
import type { Activity, Media } from '../../domain/plans'
import { useDndSensors } from '../../hooks/useDndSensors'

interface ActivitiesListProps {
  activities: Activity[]
  onActivityChange: (
    index: number,
    field: keyof Activity,
    value: string | Media[],
  ) => void
  onMoveActivity: (index: number, direction: 'up' | 'down') => void
  onReorderActivity: (from: number, to: number) => void
  onDeleteActivity: (index: number) => void
}

export function ActivitiesList({
  activities,
  onActivityChange,
  onMoveActivity,
  onReorderActivity,
  onDeleteActivity,
}: ActivitiesListProps) {
  // A small activation distance keeps a tap/click on the row's inputs from
  // being read as a drag; the KeyboardSensor drives the accessible drag flow.
  const sensors = useDndSensors()

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = activities.findIndex((a) => a.id === active.id)
    const to = activities.findIndex((a) => a.id === over.id)
    if (from !== -1 && to !== -1) onReorderActivity(from, to)
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
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
        </SortableContext>
      </DndContext>

      {activities.length === 0 && (
        <div className="text-center py-6 border border-dashed border-line rounded-xl text-xs text-ink-soft">
          No activities added yet. Add one below to get started.
        </div>
      )}
    </div>
  )
}
