import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Dumbbell,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react'
import { getStoredPlans, saveStoredPlans } from '../utils/plans'
import type { TrainingPlan, Activity } from '../utils/plans'

export const Route = createFileRoute('/admin')({
  component: Admin,
})

function Admin() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null)
  
  // State for new activity inputs
  const [newActivityType, setNewActivityType] = useState<'exercise' | 'rest'>('exercise')
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityDuration, setNewActivityDuration] = useState<number>(90)
  const [newActivitySets, setNewActivitySets] = useState<number>(3)
  const [newActivityReps, setNewActivityReps] = useState('')
  const [newActivityWeight, setNewActivityWeight] = useState('')
  
  // Notification states
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load plans from local storage on mount
  useEffect(() => {
    const stored = getStoredPlans()
    setPlans(stored)
    if (stored.length > 0) {
      setSelectedPlanId(stored[0].id)
      setEditingPlan(JSON.parse(JSON.stringify(stored[0]))) // Deep copy
    }
  }, [])

  // When changing selection, check for unsaved changes (just auto-load for simplicity but keep track)
  const handleSelectPlan = (id: string) => {
    const plan = plans.find((p) => p.id === id)
    if (plan) {
      setSelectedPlanId(id)
      setEditingPlan(JSON.parse(JSON.stringify(plan)))
      setHasUnsavedChanges(false)
      // Reset new activity fields
      setNewActivityName('')
      setNewActivityDuration(newActivityType === 'exercise' ? 120 : 90)
      setNewActivitySets(3)
      setNewActivityReps('')
      setNewActivityWeight('')
    }
  }

  // Handle plan details change
  const handleMetaChange = (field: keyof TrainingPlan, value: any) => {
    if (!editingPlan) return
    setEditingPlan({
      ...editingPlan,
      [field]: value,
    })
    setHasUnsavedChanges(true)
  }

  // Handle individual activity edits inline
  const handleActivityChange = (index: number, field: keyof Activity, value: any) => {
    if (!editingPlan) return
    const updatedActivities = [...editingPlan.activities]
    
    // Ensure correct types
    if (field === 'duration') {
      updatedActivities[index] = {
        ...updatedActivities[index],
        [field]: Math.max(1, parseInt(value) || 0),
      }
    } else if (field === 'sets') {
      updatedActivities[index] = {
        ...updatedActivities[index],
        [field]: value === '' ? undefined : Math.max(1, parseInt(value) || 0),
      }
    } else {
      updatedActivities[index] = {
        ...updatedActivities[index],
        [field]: value,
      }
    }

    setEditingPlan({
      ...editingPlan,
      activities: updatedActivities,
    })
    setHasUnsavedChanges(true)
  }

  // Reorder activities
  const moveActivity = (index: number, direction: 'up' | 'down') => {
    if (!editingPlan) return
    const updatedActivities = [...editingPlan.activities]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= updatedActivities.length) return

    // Swap
    const temp = updatedActivities[index]
    updatedActivities[index] = updatedActivities[targetIndex]
    updatedActivities[targetIndex] = temp

    setEditingPlan({
      ...editingPlan,
      activities: updatedActivities,
    })
    setHasUnsavedChanges(true)
  }

  // Delete activity
  const deleteActivity = (index: number) => {
    if (!editingPlan) return
    const updatedActivities = editingPlan.activities.filter((_, i) => i !== index)
    setEditingPlan({
      ...editingPlan,
      activities: updatedActivities,
    })
    setHasUnsavedChanges(true)
  }

  // Add new activity
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return

    const activityName = newActivityName.trim() || (newActivityType === 'rest' ? 'Rest' : 'Exercise')
    
    const newActivity: Activity = {
      id: Math.random().toString(36).substring(2, 9),
      name: activityName,
      type: newActivityType,
      duration: newActivityDuration,
      ...(newActivityType === 'exercise' && {
        sets: newActivitySets || undefined,
        reps: newActivityReps.trim() || undefined,
        weight: newActivityWeight.trim() || undefined,
      })
    }

    setEditingPlan({
      ...editingPlan,
      activities: [...editingPlan.activities, newActivity],
    })

    // Reset activity inputs
    setNewActivityName('')
    setNewActivityDuration(newActivityType === 'exercise' ? 120 : 90)
    setNewActivitySets(3)
    setNewActivityReps('')
    setNewActivityWeight('')
    setHasUnsavedChanges(true)
  }

  // Create new plan
  const handleCreateNewPlan = () => {
    const newPlan: TrainingPlan = {
      id: 'plan-' + Math.random().toString(36).substring(2, 9),
      name: 'New Training Plan',
      description: 'Describe your program goals and focus area.',
      daysPerWeek: 3,
      activities: [
        {
          id: 'act-' + Math.random().toString(36).substring(2, 9),
          name: 'Barbell Bench Press',
          type: 'exercise',
          duration: 180,
          sets: 3,
          reps: '10',
          weight: '60 kg'
        },
        {
          id: 'act-' + Math.random().toString(36).substring(2, 9),
          name: 'Rest',
          type: 'rest',
          duration: 90
        }
      ]
    }

    const updatedPlans = [...plans, newPlan]
    setPlans(updatedPlans)
    saveStoredPlans(updatedPlans)
    setSelectedPlanId(newPlan.id)
    setEditingPlan(JSON.parse(JSON.stringify(newPlan)))
    setHasUnsavedChanges(false)

    // Flash success indicator briefly
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  // Save current editing plan changes
  const handleSavePlan = () => {
    if (!editingPlan) return

    const updatedPlans = plans.map((p) => (p.id === editingPlan.id ? editingPlan : p))
    setPlans(updatedPlans)
    saveStoredPlans(updatedPlans)
    setHasUnsavedChanges(false)
    
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  // Discard current changes and reload original
  const handleDiscardChanges = () => {
    const original = plans.find((p) => p.id === selectedPlanId)
    if (original) {
      setEditingPlan(JSON.parse(JSON.stringify(original)))
      setHasUnsavedChanges(false)
    }
  }

  // Delete whole plan
  const handleDeletePlan = (id: string) => {
    if (confirm('Are you sure you want to delete this entire training plan?')) {
      const updatedPlans = plans.filter((p) => p.id !== id)
      setPlans(updatedPlans)
      saveStoredPlans(updatedPlans)

      if (updatedPlans.length > 0) {
        const fallbackId = updatedPlans[0].id
        setSelectedPlanId(fallbackId)
        setEditingPlan(JSON.parse(JSON.stringify(updatedPlans[0])))
      } else {
        setSelectedPlanId('')
        setEditingPlan(null)
      }
      setHasUnsavedChanges(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-6 lg:flex-row">
        
        {/* Left Column: Plans List */}
        <section className="w-full lg:w-80 flex-shrink-0">
          <div className="demo-panel p-5 rise-in h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[var(--sea-ink)] flex items-center gap-2">
                <Layers className="h-5 w-5 text-[var(--lagoon)]" />
                Training Programs
              </h2>
              <button
                onClick={handleCreateNewPlan}
                className="demo-button p-2 text-xs flex items-center gap-1 bg-[rgba(0,240,255,0.15)] text-[var(--lagoon)] border-[rgba(0,240,255,0.3)]"
                title="Create New Plan"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            </div>
            
            <p className="text-xs text-[var(--sea-ink-soft)] m-0">
              Select a plan to configure activities, sets, weights, and durations.
            </p>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] lg:max-h-[640px] pr-1">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPlan(p.id)}
                  className={`demo-list-item cursor-pointer flex flex-col gap-1 transition-all ${
                    p.id === selectedPlanId
                      ? 'border-[var(--lagoon-deep)] bg-[rgba(0,240,255,0.06)] shadow-[0_0_12px_rgba(0,240,255,0.08)]'
                      : 'hover:border-[rgba(0,240,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)] truncate max-w-[160px]">
                      {p.name}
                    </h3>
                    <span className="demo-pill px-2 py-0.5 text-[10px]">
                      {p.activities.filter(a => a.type === 'exercise').length} ex
                    </span>
                  </div>
                  <p className="text-xs text-[var(--sea-ink-soft)] m-0 line-clamp-2">
                    {p.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-[var(--sea-ink-soft)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[var(--lagoon-deep)]" />
                      {p.daysPerWeek} days/wk
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlan(p.id)
                      }}
                      className="text-red-400 hover:text-red-300 p-0.5 hover:bg-white/5 rounded"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {plans.length === 0 && (
                <div className="text-center py-8 border border-dashed border-[var(--line)] rounded-xl">
                  <p className="text-xs text-[var(--sea-ink-soft)] mb-3">No plans found</p>
                  <button onClick={handleCreateNewPlan} className="demo-button text-xs py-1.5 px-3">
                    Create your first plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Selected Plan Editor */}
        <section className="flex-grow">
          {editingPlan ? (
            <div className="demo-panel p-6 rise-in flex flex-col gap-6">
              
              {/* Header / Actions bar */}
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
                    {editingPlan.name || 'Unnamed Plan'}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleDiscardChanges}
                      className="demo-button demo-button-secondary py-2 px-3 text-xs flex items-center gap-1.5"
                      title="Discard changes"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Discard</span>
                    </button>
                  )}
                  <button
                    onClick={handleSavePlan}
                    className={`demo-button py-2 px-4 text-xs flex items-center gap-1.5 transition-all ${
                      hasUnsavedChanges
                        ? 'bg-[var(--lagoon-deep)] text-slate-900 border-[var(--lagoon)] shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[var(--lagoon)]'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
                  </button>
                </div>
              </div>

              {/* Save feedback banner */}
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-300 animate-pulse">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Workout program configuration successfully saved to active memory.</span>
                </div>
              )}

              {/* Plan Metadata Form */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
                    Program Name
                  </label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => handleMetaChange('name', e.target.value)}
                    className="demo-input font-display font-medium text-sm"
                    placeholder="e.g. Strength Training A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
                    Target Days / Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={editingPlan.daysPerWeek}
                    onChange={(e) => handleMetaChange('daysPerWeek', Math.max(1, parseInt(e.target.value) || 1))}
                    className="demo-input text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1.5">
                    Description & Objectives
                  </label>
                  <textarea
                    value={editingPlan.description}
                    onChange={(e) => handleMetaChange('description', e.target.value)}
                    className="demo-textarea text-xs"
                    placeholder="Brief description of key target areas, cycles, or notes..."
                  />
                </div>
              </div>

              {/* Activities Management */}
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-sm font-bold text-[var(--sea-ink-soft)] uppercase tracking-wider flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-[var(--lagoon)]" />
                  Workout Route / Activities
                </h3>

                <div className="flex flex-col gap-2">
                  {editingPlan.activities.map((act, index) => (
                    <div
                      key={act.id}
                      className={`demo-list-item flex flex-col gap-3 sm:flex-row sm:items-center p-3 border transition-all ${
                        act.type === 'rest'
                          ? 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]'
                          : 'border-[var(--line)] bg-[rgba(0,240,255,0.01)]'
                      }`}
                    >
                      {/* Left side tags */}
                      <div className="flex items-center gap-2 sm:w-28 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${
                            act.type === 'rest'
                              ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                              : 'bg-cyan-950/60 text-[var(--lagoon)] border border-[rgba(0,240,255,0.2)]'
                          }`}
                        >
                          {act.type}
                        </span>
                        <span className="text-xs text-[var(--sea-ink-soft)] font-mono font-bold">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Main fields (Inputs) */}
                      <div className="flex-grow grid gap-2 grid-cols-12">
                        <div className="col-span-12 sm:col-span-4">
                          <input
                            type="text"
                            value={act.name}
                            onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                            className="demo-input py-1.5 px-2.5 text-xs font-semibold"
                            placeholder="Activity / Rest Name"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              value={act.duration}
                              onChange={(e) => handleActivityChange(index, 'duration', e.target.value)}
                              className="demo-input py-1.5 pl-2.5 pr-6 text-xs text-right font-mono"
                              placeholder="Sec"
                            />
                            <span className="absolute right-2 top-2 text-[9px] text-[var(--sea-ink-soft)] font-mono">s</span>
                          </div>
                        </div>

                        {act.type === 'exercise' ? (
                          <>
                            <div className="col-span-4 sm:col-span-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={act.sets || ''}
                                  onChange={(e) => handleActivityChange(index, 'sets', e.target.value)}
                                  className="demo-input py-1.5 pl-2.5 pr-6 text-xs text-right font-mono"
                                  placeholder="Sets"
                                />
                                <span className="absolute right-2 top-2 text-[9px] text-[var(--sea-ink-soft)]">x</span>
                              </div>
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                              <input
                                type="text"
                                value={act.reps || ''}
                                onChange={(e) => handleActivityChange(index, 'reps', e.target.value)}
                                className="demo-input py-1.5 px-2 text-xs text-center font-mono"
                                placeholder="Reps"
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-2">
                              <input
                                type="text"
                                value={act.weight || ''}
                                onChange={(e) => handleActivityChange(index, 'weight', e.target.value)}
                                className="demo-input py-1.5 px-2 text-xs text-center font-mono"
                                placeholder="Weight"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="col-span-12 sm:col-span-8 flex items-center text-xs text-[var(--sea-ink-soft)] italic px-2">
                            Rest Period — No sets, reps or weight tracking needed.
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Reordering and Deletion) */}
                      <div className="flex items-center gap-1 sm:self-center self-end mt-2 sm:mt-0">
                        <button
                          onClick={() => moveActivity(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--sea-ink-soft)]"
                          title="Move Activity Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveActivity(index, 'down')}
                          disabled={index === editingPlan.activities.length - 1}
                          className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--sea-ink-soft)]"
                          title="Move Activity Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteActivity(index)}
                          className="p-1.5 rounded-lg border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 ml-1"
                          title="Delete Activity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {editingPlan.activities.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-[var(--line)] rounded-xl text-xs text-[var(--sea-ink-soft)]">
                      No activities added yet. Add one below to get started.
                    </div>
                  )}
                </div>

                {/* Add Activity Bar */}
                <form
                  onSubmit={handleAddActivity}
                  className="mt-3 p-4 rounded-xl border border-[rgba(0,240,255,0.15)] bg-[rgba(0,240,255,0.02)] flex flex-col gap-3"
                >
                  <h4 className="m-0 text-xs font-bold text-[var(--sea-ink)] flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-[var(--lagoon)]" />
                    Add Activity
                  </h4>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-12 items-end">
                    
                    {/* Activity Type Selection */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                        Type
                      </label>
                      <select
                        value={newActivityType}
                        onChange={(e) => {
                          const val = e.target.value as 'exercise' | 'rest'
                          setNewActivityType(val)
                          // Set reasonable default duration
                          setNewActivityDuration(val === 'exercise' ? 120 : 90)
                        }}
                        className="demo-select py-1.5 text-xs"
                      >
                        <option value="exercise">Exercise</option>
                        <option value="rest">Rest</option>
                      </select>
                    </div>

                    {/* Activity Name */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newActivityName}
                        onChange={(e) => setNewActivityName(e.target.value)}
                        placeholder={newActivityType === 'exercise' ? 'e.g. Dumbbell Bicep Curl' : 'Rest period'}
                        className="demo-input py-1.5 text-xs font-medium"
                      />
                    </div>

                    {/* Activity Duration */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                        Seconds
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newActivityDuration}
                        onChange={(e) => setNewActivityDuration(Math.max(1, parseInt(e.target.value) || 0))}
                        className="demo-input py-1.5 text-xs text-right font-mono"
                      />
                    </div>

                    {newActivityType === 'exercise' ? (
                      <>
                        {/* Sets */}
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={newActivitySets}
                            onChange={(e) => setNewActivitySets(Math.max(1, parseInt(e.target.value) || 0))}
                            className="demo-input py-1.5 text-xs text-right font-mono"
                          />
                        </div>

                        {/* Reps */}
                        <div className="sm:col-span-1.5 sm:col-span-1">
                          <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                            Reps
                          </label>
                          <input
                            type="text"
                            value={newActivityReps}
                            onChange={(e) => setNewActivityReps(e.target.value)}
                            placeholder="e.g. 12"
                            className="demo-input py-1.5 text-xs text-center font-mono"
                          />
                        </div>

                        {/* Weight */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">
                            Weight
                          </label>
                          <input
                            type="text"
                            value={newActivityWeight}
                            onChange={(e) => setNewActivityWeight(e.target.value)}
                            placeholder="e.g. 20 kg"
                            className="demo-input py-1.5 text-xs text-center font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-4" /> // Placeholder spacing
                    )}

                  </div>

                  <div className="flex justify-end mt-1">
                    <button
                      type="submit"
                      className="demo-button py-1.5 px-4 text-xs bg-[var(--lagoon-deep)] text-slate-900 border-[var(--lagoon)] font-bold flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Route
                    </button>
                  </div>
                </form>

              </div>

            </div>
          ) : (
            <div className="demo-panel p-8 text-center py-16 rise-in">
              <Dumbbell className="h-10 w-10 text-[var(--sea-ink-soft)] mx-auto mb-3 animate-bounce" />
              <h2 className="m-0 font-display text-lg font-bold text-[var(--sea-ink)] mb-2">
                No active plan selected
              </h2>
              <p className="text-sm text-[var(--sea-ink-soft)] mb-5 max-w-sm mx-auto">
                Please select a training program from the list on the left or create a new one to begin customization.
              </p>
              <button onClick={handleCreateNewPlan} className="demo-button text-xs py-2 px-4">
                Create a New Program
              </button>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
