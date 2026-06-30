import { useState, useEffect } from 'react'
import type { TrainingPlan, Activity } from '../domain/plans'
import { planRepository } from '../repositories'
import { createId } from '../utils/id'

function swapArrayElements<T>(arr: T[], i: number, j: number): T[] {
  const copy = [...arr]
  const temp = copy[i]
  copy[i] = copy[j]
  copy[j] = temp
  return copy
}

function parseDurationField(value: any): number {
  return Math.max(1, parseInt(value) || 0)
}

function parseSetsField(value: any): number | undefined {
  return value === '' ? undefined : Math.max(1, parseInt(value) || 0)
}

function parseActivityField(field: keyof Activity, value: any) {
  if (field === 'duration') return parseDurationField(value)
  if (field === 'sets') return parseSetsField(value)
  return value
}

interface UsePlanEditorProps {
  plans: TrainingPlan[]
  selectedPlanId: string
  setSelectedPlanId: (id: string) => void
  setPlans: React.Dispatch<React.SetStateAction<TrainingPlan[]>>
  loadPlans: (selectId?: string) => Promise<TrainingPlan | null>
}

// fallow-ignore-next-line complexity
function resolveSelectedPlan(loaded: TrainingPlan[], selectId?: string, currentId?: string) {
  const targetId = selectId ?? currentId ?? loaded[0]?.id ?? ''
  const match = loaded.find((p) => p.id === targetId)
  return match ?? loaded[0] ?? null
}

function usePlansList() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  const loadPlans = async (selectId?: string) => {
    try {
      const loaded = await planRepository.list()
      setPlans(loaded)
      const selected = resolveSelectedPlan(loaded, selectId, selectedPlanId)
      setSelectedPlanId(selected?.id ?? '')
      return selected
    } catch (error) {
      console.error('Failed to load training plans:', error)
      return null
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const handleSelectPlan = (id: string) => {
    setSelectedPlanId(id)
  }

  return {
    plans,
    setPlans,
    selectedPlanId,
    setSelectedPlanId,
    loadPlans,
    handleSelectPlan,
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

  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId)
    setEditingPlan(plan ? JSON.parse(JSON.stringify(plan)) : null)
    setHasUnsavedChanges(false)
  }, [selectedPlanId, plans])

  const handleMetaChange = (field: keyof TrainingPlan, value: any) => {
    if (!editingPlan) return
    setEditingPlan({ ...editingPlan, [field]: value })
    setHasUnsavedChanges(true)
  }

  const handleActivityChange = (index: number, field: keyof Activity, value: any) => {
    if (!editingPlan) return
    const updatedActivities = [...editingPlan.activities]
    const activity = updatedActivities[index]
    if (!activity) return

    updatedActivities[index] = {
      ...activity,
      [field]: parseActivityField(field, value),
    }

    setEditingPlan({ ...editingPlan, activities: updatedActivities })
    setHasUnsavedChanges(true)
  }

  // fallow-ignore-next-line complexity
  const moveActivity = (index: number, direction: 'up' | 'down') => {
    if (!editingPlan) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editingPlan.activities.length) return

    setEditingPlan({
      ...editingPlan,
      activities: swapArrayElements(editingPlan.activities, index, targetIndex),
    })
    setHasUnsavedChanges(true)
  }

  const deleteActivity = (index: number) => {
    if (!editingPlan) return
    setEditingPlan({
      ...editingPlan,
      activities: editingPlan.activities.filter((_, i) => i !== index),
    })
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
  }

  const handleCreateNewPlan = async () => {
    const newPlanData = {
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
          weight: '60 kg'
        },
        {
          id: createId('act'),
          name: 'Rest',
          type: 'rest' as const,
          duration: 90
        }
      ]
    }
    try {
      const created = await planRepository.create(newPlanData)
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
      await planRepository.update(id, patch)
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
    if (!confirm('Are you sure you want to delete this entire training plan?')) {
      return
    }
    try {
      await planRepository.remove(id)
      const loaded = await planRepository.list()
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
    handleActivityChange,
    moveActivity,
    deleteActivity,
    handleAddActivity,
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
