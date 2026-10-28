import { Plus } from 'lucide-react'

interface EmptyPlanEditorStateProps {
  onCreateNewPlan: () => void
}

export function EmptyPlanEditorState({
  onCreateNewPlan,
}: EmptyPlanEditorStateProps) {
  return (
    <div className="demo-panel p-8 text-center py-16 rise-in">
      <p className="m-0 mb-4 text-sm text-ink-soft">Select or create a plan</p>
      <button
        onClick={onCreateNewPlan}
        className="demo-button text-xs py-2 px-4 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Plus className="h-3.5 w-3.5" />
        New plan
      </button>
    </div>
  )
}
