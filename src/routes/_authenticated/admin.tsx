import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useAdminState } from '../../hooks/useAdminState'
import { PlansSidebar } from '../../components/admin/PlansSidebar'
import { PlanEditorHeader } from '../../components/admin/PlanEditorHeader'
import { PlanMetaForm } from '../../components/admin/PlanMetaForm'
import { ActivitiesList } from '../../components/admin/ActivitiesList'
import { AddActivityForm } from '../../components/admin/AddActivityForm'
import { EmptyPlanEditorState } from '../../components/admin/EmptyPlanEditorState'

export const Route = createFileRoute('/_authenticated/admin')({
  component: Admin,
})

function formatTotal(activities: Array<{ duration: number }>) {
  const sec = activities.reduce((sum, a) => sum + a.duration, 0)
  const min = Math.floor(sec / 60)
  return min > 0
    ? `${min} min ${sec % 60 ? `${sec % 60} s` : ''}`.trim()
    : `${sec} s`
}

interface PlanEditorPanelProps {
  editingPlan: ReturnType<typeof useAdminState>['editingPlan']
  saveSuccess: boolean
  hasUnsavedChanges: boolean
  handlers: Pick<
    ReturnType<typeof useAdminState>,
    | 'handleMetaChange'
    | 'handleActivityChange'
    | 'moveActivity'
    | 'reorderActivity'
    | 'deleteActivity'
    | 'handleAddActivity'
    | 'handleDiscardChanges'
    | 'handleSavePlan'
  >
}

function PlanEditorPanel({
  editingPlan,
  saveSuccess,
  hasUnsavedChanges,
  handlers,
}: PlanEditorPanelProps) {
  if (!editingPlan) return null
  return (
    <div className="demo-panel p-5 rise-in flex flex-col gap-5">
      <PlanEditorHeader
        planName={editingPlan.name}
        hasUnsavedChanges={hasUnsavedChanges}
        onDiscardChanges={handlers.handleDiscardChanges}
        onSavePlan={handlers.handleSavePlan}
      />
      {saveSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-xl px-4 py-2.5 text-xs text-success"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Saved</span>
        </div>
      )}
      <PlanMetaForm plan={editingPlan} onChange={handlers.handleMetaChange} />
      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-xs font-semibold text-ink-soft uppercase tracking-wider">
          Activities · {editingPlan.activities.length} ·{' '}
          {formatTotal(editingPlan.activities)}
        </h3>
        <ActivitiesList
          activities={editingPlan.activities}
          onActivityChange={handlers.handleActivityChange}
          onMoveActivity={handlers.moveActivity}
          onReorderActivity={handlers.reorderActivity}
          onDeleteActivity={handlers.deleteActivity}
        />
        <AddActivityForm
          key={editingPlan.id}
          onAddActivity={handlers.handleAddActivity}
        />
      </div>
    </div>
  )
}

function Admin() {
  const {
    plans,
    selectedPlanId,
    editingPlan,
    saveSuccess,
    hasUnsavedChanges,
    handleSelectPlan,
    handleMetaChange,
    handleActivityChange,
    moveActivity,
    reorderActivity,
    deleteActivity,
    handleAddActivity,
    handleCreateNewPlan,
    handleSavePlan,
    handleDiscardChanges,
    handleDeletePlan,
    reorderPlans,
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
          onReorderPlans={reorderPlans}
        />
        <section className="flex-grow">
          {editingPlan ? (
            <PlanEditorPanel
              editingPlan={editingPlan}
              saveSuccess={saveSuccess}
              hasUnsavedChanges={hasUnsavedChanges}
              handlers={{
                handleMetaChange,
                handleActivityChange,
                moveActivity,
                reorderActivity,
                deleteActivity,
                handleAddActivity,
                handleDiscardChanges,
                handleSavePlan,
              }}
            />
          ) : (
            <EmptyPlanEditorState onCreateNewPlan={handleCreateNewPlan} />
          )}
        </section>
      </div>
    </main>
  )
}
