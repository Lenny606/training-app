import { Dumbbell } from 'lucide-react'

interface EmptyPlanEditorStateProps {
  onCreateNewPlan: () => void
}

export function EmptyPlanEditorState({
  onCreateNewPlan,
}: EmptyPlanEditorStateProps) {
  return (
    <div className="demo-panel p-8 text-center py-16 rise-in">
      <Dumbbell className="h-10 w-10 text-ink-soft mx-auto mb-3 animate-bounce" />
      <h2 className="m-0 font-display text-lg font-bold text-ink mb-2">
        No active plan selected
      </h2>
      <p className="text-sm text-ink-soft mb-5 max-w-sm mx-auto">
        Please select a training program from the list on the left or create a
        new one to begin customization.
      </p>
      <button
        onClick={onCreateNewPlan}
        className="demo-button text-xs py-2 px-4"
      >
        Create a New Program
      </button>
    </div>
  )
}
