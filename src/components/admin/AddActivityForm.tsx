import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Activity, Media } from '../../domain/plans'
import { MediaUpload } from './MediaUpload'

interface AddActivityFormProps {
  onAddActivity: (activity: Omit<Activity, 'id'>) => void
}

interface AddExerciseFieldsProps {
  sets: string | number
  reps: string
  weight: string
  setSets: (val: string | number) => void
  setReps: (val: string) => void
  setWeight: (val: string) => void
}

function AddExerciseFields({
  sets,
  reps,
  weight,
  setSets,
  setReps,
  setWeight,
}: AddExerciseFieldsProps) {
  return (
    <>
      <div className="sm:col-span-1">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Sets
        </label>
        <input
          type="number"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={() => {
            const parsed = parseInt(sets.toString())
            if (isNaN(parsed) || parsed <= 0) {
              setSets(3)
            } else {
              setSets(parsed)
            }
          }}
          className="demo-input py-1.5 text-xs text-right font-mono"
          placeholder="Sets"
        />
      </div>

      <div className="sm:col-span-1">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Reps
        </label>
        <input
          type="text"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="e.g. 12"
          className="demo-input py-1.5 text-xs text-center font-mono"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Weight
        </label>
        <input
          type="text"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 20 kg"
          className="demo-input py-1.5 text-xs text-center font-mono"
        />
      </div>
    </>
  )
}

function getExerciseParams(sets: number, reps: string, weight: string) {
  return {
    sets: sets || undefined,
    reps: reps.trim() || undefined,
    weight: weight.trim() || undefined,
  }
}

function getDefaultName(type: 'exercise' | 'rest') {
  return type === 'rest' ? 'Rest' : 'Exercise'
}

function useAddActivityForm(
  onAddActivity: (activity: Omit<Activity, 'id'>) => void,
) {
  const [type, setType] = useState<'exercise' | 'rest'>('exercise')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState<string | number>(120)
  const [sets, setSets] = useState<string | number>(3)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [mediaList, setMediaList] = useState<Media[]>([])

  const handleTypeChange = (newType: 'exercise' | 'rest') => {
    setType(newType)
    setDuration(120)
    setMediaList([])
  }

  const resetForm = () => {
    setName('')
    setDuration(120)
    setSets(3)
    setReps('')
    setWeight('')
    setMediaList([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const activityName = name.trim() || getDefaultName(type)
    const parsedDuration = parseInt(duration.toString())
    const finalDuration =
      isNaN(parsedDuration) || parsedDuration <= 0 ? 120 : parsedDuration

    const payload: Omit<Activity, 'id'> = {
      name: activityName,
      type,
      duration: finalDuration,
      media: mediaList.length > 0 ? mediaList : undefined,
    }

    if (type === 'exercise') {
      const parsedSets = parseInt(sets.toString())
      const finalSets = isNaN(parsedSets) || parsedSets <= 0 ? 3 : parsedSets
      Object.assign(payload, getExerciseParams(finalSets, reps, weight))
    }

    onAddActivity(payload)
    resetForm()
  }

  return {
    type,
    name,
    duration,
    sets,
    reps,
    weight,
    mediaList,
    setName,
    setDuration,
    setSets,
    setReps,
    setWeight,
    setMediaList,
    handleTypeChange,
    handleSubmit,
  }
}

interface CoreFieldsProps {
  type: 'exercise' | 'rest'
  name: string
  duration: string | number
  setName: (val: string) => void
  setDuration: (val: string | number) => void
  handleTypeChange: (newType: 'exercise' | 'rest') => void
}

function CoreFields({
  type,
  name,
  duration,
  setName,
  setDuration,
  handleTypeChange,
}: CoreFieldsProps) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Type
        </label>
        <select
          value={type}
          onChange={(e) =>
            handleTypeChange(e.target.value as 'exercise' | 'rest')
          }
          className="demo-select py-1.5 text-xs"
        >
          <option value="exercise">Exercise</option>
          <option value="rest">Rest</option>
        </select>
      </div>

      <div className="sm:col-span-4">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === 'exercise' ? 'e.g. Dumbbell Bicep Curl' : 'Rest period'
          }
          className="demo-input py-1.5 text-xs font-medium"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Seconds
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={() => {
            const parsed = parseInt(duration.toString())
            if (isNaN(parsed) || parsed <= 0) {
              setDuration(120)
            } else {
              setDuration(parsed)
            }
          }}
          className="demo-input py-1.5 text-xs text-right font-mono"
          placeholder="Sec"
        />
      </div>
    </>
  )
}

export function AddActivityForm({ onAddActivity }: AddActivityFormProps) {
  const {
    type,
    name,
    duration,
    sets,
    reps,
    weight,
    mediaList,
    setName,
    setDuration,
    setSets,
    setReps,
    setWeight,
    setMediaList,
    handleTypeChange,
    handleSubmit,
  } = useAddActivityForm(onAddActivity)

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-xl border border-lagoon/20 bg-lagoon/[0.03] flex flex-col gap-3"
    >
      <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5 text-lagoon" />
        Add Activity
      </h4>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-12 items-end">
        <CoreFields
          type={type}
          name={name}
          duration={duration}
          setName={setName}
          setDuration={setDuration}
          handleTypeChange={handleTypeChange}
        />

        {type === 'exercise' ? (
          <AddExerciseFields
            sets={sets}
            reps={reps}
            weight={weight}
            setSets={setSets}
            setReps={setReps}
            setWeight={setWeight}
          />
        ) : (
          <div className="sm:col-span-4" />
        )}
      </div>

      {type === 'exercise' && (
        <div className="border-t border-line/35 pt-3">
          <label className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
            Activity Media (Images / Videos)
          </label>
          <MediaUpload media={mediaList} onChange={setMediaList} />
        </div>
      )}

      <div className="flex justify-end mt-1">
        <button
          type="submit"
          className="demo-button demo-button-sm bg-lagoon-deep text-lagoon-ink border-lagoon font-bold flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to Route
        </button>
      </div>
    </form>
  )
}
