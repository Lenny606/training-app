import { RotateCcw, Save } from 'lucide-react'

interface PlanEditorHeaderProps {
  planName: string
  hasUnsavedChanges: boolean
  onDiscardChanges: () => void
  onSavePlan: () => void
}

function getSaveButtonClass(hasUnsavedChanges: boolean) {
  const base =
    'demo-button demo-button-sm flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:outline-none'
  const modified =
    'bg-lagoon-deep text-lagoon-ink border-lagoon shadow-glow-lagoon hover:bg-lagoon'
  const saved =
    'bg-success/10 text-success border-success/30 hover:bg-success/15'
  return `${base} ${hasUnsavedChanges ? modified : saved}`
}

// fallow-ignore-next-line complexity
export function PlanEditorHeader({
  planName,
  hasUnsavedChanges,
  onDiscardChanges,
  onSavePlan,
}: PlanEditorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-line">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="m-0 font-display text-xl font-bold tracking-tight text-ink truncate">
          {planName || 'Unnamed Plan'}
        </h1>
        {hasUnsavedChanges && (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500"
            title="Unsaved changes"
            aria-label="Unsaved changes"
            role="status"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasUnsavedChanges && (
          <button
            onClick={() => {
              if (window.confirm('Discard unsaved changes?')) {
                onDiscardChanges()
              }
            }}
            className="demo-button demo-button-sm demo-button-secondary flex items-center gap-1.5 focus-visible:ring-2 focus-visible:outline-none"
            title="Discard changes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Discard</span>
          </button>
        )}
        <button
          onClick={onSavePlan}
          className={getSaveButtonClass(hasUnsavedChanges)}
        >
          <Save className="h-3.5 w-3.5" />
          <span>{hasUnsavedChanges ? 'Save' : 'Saved'}</span>
        </button>
      </div>
    </div>
  )
}
