import { RotateCcw, Save } from 'lucide-react'

interface PlanEditorHeaderProps {
  planName: string
  hasUnsavedChanges: boolean
  onDiscardChanges: () => void
  onSavePlan: () => void
}

function getSaveButtonClass(hasUnsavedChanges: boolean) {
  const base = 'demo-button demo-button-sm flex items-center gap-1.5 transition-all'
  const modified = 'bg-lagoon-deep text-lagoon-ink border-lagoon shadow-[0_0_12px_color-mix(in_oklab,var(--lagoon)_25%,transparent)] hover:bg-lagoon'
  const saved = 'bg-success/10 text-success border-success/30 hover:bg-success/15'
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
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-widest text-lagoon font-bold font-display">
            Editing Mode
          </span>
          {hasUnsavedChanges && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
          )}
        </div>
        <h1 className="m-0 font-display text-2xl font-black tracking-tight text-ink">
          {planName || 'Unnamed Plan'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {hasUnsavedChanges && (
          <button
            onClick={onDiscardChanges}
            className="demo-button demo-button-sm demo-button-secondary flex items-center gap-1.5"
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
          <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
        </button>
      </div>
    </div>
  )
}

