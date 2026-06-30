import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Dumbbell } from 'lucide-react'
import { useAdminState } from '../hooks/useAdminState'
import { PlansSidebar } from '../components/admin/PlansSidebar'
import { PlanEditorHeader } from '../components/admin/PlanEditorHeader'
import { PlanMetaForm } from '../components/admin/PlanMetaForm'
import { ActivitiesList } from '../components/admin/ActivitiesList'
import { AddActivityForm } from '../components/admin/AddActivityForm'
import { EmptyPlanEditorState } from '../components/admin/EmptyPlanEditorState'

export const Route = createFileRoute('/admin')({
  component: Admin,
})

interface PlanEditorPanelProps {
  editingPlan: ReturnType<typeof useAdminState>['editingPlan']
  saveSuccess: boolean
  hasUnsavedChanges: boolean
  handlers: Pick<ReturnType<typeof useAdminState>,
    'handleMetaChange' | 'handleActivityChange' | 'moveActivity' |
    'deleteActivity' | 'handleAddActivity' | 'handleDiscardChanges' | 'handleSavePlan'>
}

function PlanEditorPanel({ editingPlan, saveSuccess, hasUnsavedChanges, handlers }: PlanEditorPanelProps) {
  if (!editingPlan) return null
  return (
    <div className="demo-panel p-6 rise-in flex flex-col gap-6">
      <PlanEditorHeader
        planName={editingPlan.name}
        hasUnsavedChanges={hasUnsavedChanges}
        onDiscardChanges={handlers.handleDiscardChanges}
        onSavePlan={handlers.handleSavePlan}
      />
      {saveSuccess && (
        <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-300 animate-pulse">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>Workout program configuration successfully saved to active memory.</span>
        </div>
      )}
      <PlanMetaForm plan={editingPlan} onChange={handlers.handleMetaChange} />
      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-sm font-bold text-[var(--sea-ink-soft)] uppercase tracking-wider flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-[var(--lagoon)]" />
          Workout Route / Activities
        </h3>
        <ActivitiesList
          activities={editingPlan.activities}
          onActivityChange={handlers.handleActivityChange}
          onMoveActivity={handlers.moveActivity}
          onDeleteActivity={handlers.deleteActivity}
        />
        <AddActivityForm key={editingPlan.id} onAddActivity={handlers.handleAddActivity} />
      </div>
    </div>
  )
}

function Admin() {
  const {
    plans, selectedPlanId, editingPlan, saveSuccess, hasUnsavedChanges,
    handleSelectPlan, handleMetaChange, handleActivityChange, moveActivity,
    deleteActivity, handleAddActivity, handleCreateNewPlan, handleSavePlan,
    handleDiscardChanges, handleDeletePlan,
  } = useAdminState()

  return (
    <main className="page-wrap px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-6 lg:flex-row">
        <PlansSidebar
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={handleSelectPlan}
          onCreateNewPlan={handleCreateNewPlan}
          onDeletePlan={handleDeletePlan}
        />
        <section className="flex-grow">
          {editingPlan ? (
            <PlanEditorPanel
              editingPlan={editingPlan}
              saveSuccess={saveSuccess}
              hasUnsavedChanges={hasUnsavedChanges}
              handlers={{ handleMetaChange, handleActivityChange, moveActivity, deleteActivity, handleAddActivity, handleDiscardChanges, handleSavePlan }}
            />
          ) : (
            <EmptyPlanEditorState onCreateNewPlan={handleCreateNewPlan} />
          )}
        </section>
      </div>
    </main>
  )
}

