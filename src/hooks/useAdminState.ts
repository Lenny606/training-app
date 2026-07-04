import { useState, useEffect, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { DEFAULT_ACTIVITY_DURATION } from '../domain/plans'
import type { TrainingPlan, Activity, Media } from '../domain/plans'
import {
  createPlan,
  deletePlan,
  listPlans,
  reorderPlans as reorderPlansFn,
  updatePlan,
} from '../server/plans'
import { createId } from '../utils/id'

function parseDurationField(value: string): number {
  const parsed = parseInt(value)
  if (isNaN(parsed) || parsed <= 0) {
    return DEFAULT_ACTIVITY_DURATION
  }
  return parsed
}

// Sets are optional — empty or invalid input clears the field.
function parseSetsField(value: string): number | undefined {
  const parsed = parseInt(value)
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed
}

function parseActivityField(
  field: keyof Activity,
  value: string | Media[],
): Activity[keyof Activity] {
  if (field === 'duration' && typeof value === 'string')
    return parseDurationField(value)
  if (field === 'sets' && typeof value === 'string')
    return parseSetsField(value)
  return value
}

// Seed content for a freshly created plan (one exercise + one rest).
function createDefaultPlanData() {
  return {
    name: 'New Training Plan',
    description: 'Describe your program goals and focus area.',
    daysPerWeek: 3,
    activities: [
      {
        id: createId('act'),
        name: 'Barbell Bench Press',
        type: 'exercise' as const,
        duration: 180,
        sets: 3,
        reps: '10',
        weight: '60 kg',
      },
      {
        id: createId('act'),
        name: 'Rest',
        type: 'rest' as const,
        duration: 90,
      },
    ],
  }
}

interface UsePlanEditorProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  setSelectedPlanId: (id: string) => void
  setPlans: React.Dispatch<React.SetStateAction<TrainingPlan[]>>
  loadPlans: (selectId?: string) => Promise<TrainingPlan | null>
}

// fallow-ignore-next-line complexity
function resolveSelectedPlan(
  loaded: TrainingPlan[],
  selectId?: string,
  currentId?: string,
) {
  const targetId = selectId ?? currentId ?? loaded[0]?.id ?? ''
  const match = loaded.find((p) => p.id === targetId)
  return match ?? loaded[0] ?? null
}

function usePlansList() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  const selectedPlanIdRef = useRef(selectedPlanId)
  useEffect(() => {
    selectedPlanIdRef.current = selectedPlanId
  }, [selectedPlanId])

  const loadPlans = useCallback(async (selectId?: string) => {
    try {
      const loaded = await listPlans()
      setPlans(loaded)
      const selected = resolveSelectedPlan(
        loaded,
        selectId,
        selectedPlanIdRef.current,
      )
      setSelectedPlanId(selected?.id ?? '')
      return selected
    } catch (error) {
      console.error('Failed to load training plans:', error)
      return null
    }
  }, [])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const handleSelectPlan = (id: string) => {
    setSelectedPlanId(id)
  }

  // Sidebar has no "Save" button, so a reorder persists immediately. Optimistic:
  // apply the new order locally, then write it through; roll back on failure.
  const reorderPlans = async (from: number, to: number) => {
    if (from === to) return
    const next = arrayMove(plans, from, to)
    setPlans(next)
    try {
      await reorderPlansFn({ data: { orderedIds: next.map((p) => p.id) } })
    } catch (error) {
      console.error('Failed to reorder training plans:', error)
      loadPlans(selectedPlanId)
    }
  }

  return {
    plans,
    setPlans,
    selectedPlanId,
    setSelectedPlanId,
    loadPlans,
    handleSelectPlan,
    reorderPlans,
  }
}

// Activity-level edits against the in-progress editing draft. Split out of
// usePlanEditor so the plan-level concerns (load, save, delete) stay readable.
function useActivityEditor(
  editingPlan: TrainingPlan | null,
  setEditingPlan: React.Dispatch<React.SetStateAction<TrainingPlan | null>>,
  markDirty: () => void,
) {
  const handleActivityChange = (
    index: number,
    field: keyof Activity,
    value: string | Media[],
  ) => {
    if (!editingPlan) return
    const updatedActivities = [...editingPlan.activities]
    const activity = updatedActivities[index]
    if (!activity) return

    updatedActivities[index] = {
      ...activity,
      [field]: parseActivityField(field, value),
    } as Activity

    setEditingPlan({ ...editingPlan, activities: updatedActivities })
    markDirty()
  }

  // Move an activity to an arbitrary position (drag & drop, or keyboard drag).
  const reorderActivity = (from: number, to: number) => {
    if (!editingPlan || from === to) return
    if (to < 0 || to >= editingPlan.activities.length) return
    setEditingPlan({
      ...editingPlan,
      activities: arrayMove(editingPlan.activities, from, to),
    })
    markDirty()
  }

  // Arrow-button fallback (a11y): one step up/down, mapped onto reorderActivity.
  const moveActivity = (index: number, direction: 'up' | 'down') => {
    reorderActivity(index, direction === 'up' ? index - 1 : index + 1)
  }

  const deleteActivity = (index: number) => {
    if (!editingPlan) return
    setEditingPlan({
      ...editingPlan,
      activities: editingPlan.activities.filter((_, i) => i !== index),
    })
    markDirty()
  }

  const handleAddActivity = (newActData: Omit<Activity, 'id'>) => {
    if (!editingPlan) return
    const newActivity: Activity = {
      id: createId('act'),
      ...newActData,
    }
    setEditingPlan({
      ...editingPlan,
      activities: [...editingPlan.activities, newActivity],
    })
    markDirty()
  }

  return {
    handleActivityChange,
    reorderActivity,
    moveActivity,
    deleteActivity,
    handleAddActivity,
  }
}

function usePlanEditor({
  plans,
  selectedPlanId,
  setSelectedPlanId,
  setPlans,
  loadPlans,
}: UsePlanEditorProps) {
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Key on the selected plan's object identity, not the whole array: reordering
  // the sidebar (arrayMove keeps element refs) must not reset unsaved edits, but
  // a reload (fresh refs from the server) or a new selection should.
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null
  useEffect(() => {
    setEditingPlan(
      selectedPlan ? JSON.parse(JSON.stringify(selectedPlan)) : null,
    )
    setHasUnsavedChanges(false)
  }, [selectedPlanId, selectedPlan])

  const activityEditor = useActivityEditor(editingPlan, setEditingPlan, () =>
    setHasUnsavedChanges(true),
  )

  const handleMetaChange = (
    field: keyof TrainingPlan,
    value: string | number,
  ) => {
    if (!editingPlan) return
    setEditingPlan({ ...editingPlan, [field]: value })
    setHasUnsavedChanges(true)
  }

  const handleCreateNewPlan = async () => {
    try {
      const created = await createPlan({ data: createDefaultPlanData() })
      await loadPlans(created.id)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to create training plan:', error)
    }
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return
    try {
      const { id, ...patch } = editingPlan
      await updatePlan({ data: { id, patch } })
      await loadPlans(id)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save training plan:', error)
    }
  }

  const handleDiscardChanges = () => {
    const original = plans.find((p) => p.id === selectedPlanId)
    if (original) {
      setEditingPlan(JSON.parse(JSON.stringify(original)))
      setHasUnsavedChanges(false)
    }
  }

  // fallow-ignore-next-line complexity
  const handleDeletePlan = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this entire training plan?')
    ) {
      return
    }
    try {
      await deletePlan({ data: { id } })
      const loaded = await listPlans()
      setPlans(loaded)
      const fallbackId = loaded[0]?.id ?? ''
      setSelectedPlanId(fallbackId)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to delete training plan:', error)
    }
  }

  return {
    editingPlan,
    saveSuccess,
    hasUnsavedChanges,
    handleMetaChange,
    ...activityEditor,
    handleCreateNewPlan,
    handleSavePlan,
    handleDiscardChanges,
    handleDeletePlan,
  }
}

export function useAdminState() {
  const plansListState = usePlansList()
  const editorState = usePlanEditor({
    plans: plansListState.plans,
    selectedPlanId: plansListState.selectedPlanId,
    setSelectedPlanId: plansListState.setSelectedPlanId,
    setPlans: plansListState.setPlans,
    loadPlans: plansListState.loadPlans,
  })

  return {
    ...plansListState,
    ...editorState,
  }
}
