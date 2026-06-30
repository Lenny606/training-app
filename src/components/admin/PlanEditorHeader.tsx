import { RotateCcw, Save } from 'lucide-react'

interface PlanEditorHeaderProps {
  planName: string
  hasUnsavedChanges: boolean
  onDiscardChanges: () => void
  onSavePlan: () => void
}

function getSaveButtonClass(hasUnsavedChanges: boolean) {
  const base = 'demo-button py-2 px-4 text-xs flex items-center gap-1.5 transition-all'
  const modified = 'bg-[var(--lagoon-deep)] text-slate-900 border-[var(--lagoon)] shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[var(--lagoon)]'
  const saved = 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
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
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--lagoon)] font-bold font-display">
            Editing Mode
          </span>
          {hasUnsavedChanges && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
          )}
        </div>
        <h1 className="m-0 font-display text-2xl font-black tracking-tight text-[var(--sea-ink)]">
          {planName || 'Unnamed Plan'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {hasUnsavedChanges && (
          <button
            onClick={onDiscardChanges}
            className="demo-button demo-button-secondary py-2 px-3 text-xs flex items-center gap-1.5"
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

