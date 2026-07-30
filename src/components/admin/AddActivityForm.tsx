import { useState, useId } from 'react'
import { Plus } from 'lucide-react'
import { DEFAULT_ACTIVITY_DURATION } from '../../domain/plans'
import type { Activity, Media } from '../../domain/plans'
import { MediaUpload } from './MediaUpload'

interface AddActivityFormProps {
  onAddActivity: (activity: Omit<Activity, 'id'>) => void
}

interface AddExerciseFieldsProps {
  sets: string
  reps: string
  weight: string
  setSets: (val: string) => void
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
  const setsId = useId()
  const repsId = useId()
  const weightId = useId()

  return (
    <div className="grid grid-cols-12 gap-3 w-full">
      <div className="col-span-4">
        <label htmlFor={setsId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Sets
        </label>
        <input
          id={setsId}
          type="number"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="demo-input py-1.5 text-xs text-right font-mono"
          placeholder="Sets"
        />
      </div>

      <div className="col-span-4">
        <label htmlFor={repsId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Reps
        </label>
        <input
          id={repsId}
          type="text"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="e.g. 12"
          className="demo-input py-1.5 text-xs text-center font-mono"
        />
      </div>

      <div className="col-span-4">
        <label htmlFor={weightId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Weight
        </label>
        <input
          id={weightId}
          type="text"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 20 kg"
          className="demo-input py-1.5 text-xs text-center font-mono"
        />
      </div>
    </div>
  )
}

function useAddActivityForm(
  onAddActivity: (activity: Omit<Activity, 'id'>) => void,
) {
  const [type, setType] = useState<'exercise' | 'rest' | 'learning'>('exercise')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('')
  const [description, setDescription] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [mediaList, setMediaList] = useState<Media[]>([])

  const handleTypeChange = (newType: 'exercise' | 'rest' | 'learning') => {
    setType(newType)
    setDuration('')
    setDescription('')
    setMediaList([])
  }

  const resetForm = () => {
    setName('')
    setDuration('')
    setDescription('')
    setSets('')
    setReps('')
    setWeight('')
    setMediaList([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Only the name is required; duration falls back to the default and the
    // remaining fields stay empty unless filled in.
    const activityName = name.trim()
    if (!activityName) return

    const parsedDuration = parseInt(duration)
    const finalDuration =
      isNaN(parsedDuration) || parsedDuration <= 0
        ? DEFAULT_ACTIVITY_DURATION
        : parsedDuration

    const payload: Omit<Activity, 'id'> = {
      name: activityName,
      type,
      duration: finalDuration,
    }

    if (type === 'exercise') {
      const parsedSets = parseInt(sets)
      Object.assign(payload, {
        sets: isNaN(parsedSets) || parsedSets <= 0 ? undefined : parsedSets,
        reps: reps.trim() || undefined,
        weight: weight.trim() || undefined,
        media: mediaList.length > 0 ? mediaList : undefined,
      })
    } else if (type === 'learning') {
      Object.assign(payload, {
        description: description.trim() || undefined,
      })
    }

    onAddActivity(payload)
    resetForm()
  }

  return {
    type,
    name,
    duration,
    description,
    sets,
    reps,
    weight,
    mediaList,
    setName,
    setDuration,
    setDescription,
    setSets,
    setReps,
    setWeight,
    setMediaList,
    handleTypeChange,
    handleSubmit,
  }
}

interface CoreFieldsProps {
  type: 'exercise' | 'rest' | 'learning'
  name: string
  duration: string
  setName: (val: string) => void
  setDuration: (val: string) => void
  handleTypeChange: (newType: 'exercise' | 'rest' | 'learning') => void
}

function CoreFields({
  type,
  name,
  duration,
  setName,
  setDuration,
  handleTypeChange,
}: CoreFieldsProps) {
  const typeId = useId()
  const nameId = useId()
  const durationId = useId()

  return (
    <div className="grid grid-cols-12 gap-3 w-full">
      <div className="col-span-12 sm:col-span-3">
        <label htmlFor={typeId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Type
        </label>
        <select
          id={typeId}
          value={type}
          onChange={(e) =>
            handleTypeChange(e.target.value as 'exercise' | 'rest' | 'learning')
          }
          className="demo-select py-1.5 text-xs"
        >
          <option value="exercise">Exercise</option>
          <option value="rest">Rest</option>
          <option value="learning">Learning</option>
        </select>
      </div>

      <div className="col-span-8 sm:col-span-6">
        <label htmlFor={nameId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={
            type === 'exercise'
              ? 'e.g. Dumbbell Bicep Curl'
              : type === 'learning'
                ? 'e.g. Learn proper posture'
                : 'Rest period'
          }
          className="demo-input py-1.5 text-xs font-medium"
        />
      </div>

      <div className="col-span-4 sm:col-span-3">
        <label htmlFor={durationId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
          Seconds
        </label>
        <input
          id={durationId}
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="demo-input py-1.5 text-xs text-right font-mono"
          placeholder={`${DEFAULT_ACTIVITY_DURATION}`}
        />
      </div>
    </div>
  )
}

export function AddActivityForm({ onAddActivity }: AddActivityFormProps) {
  const descriptionId = useId()
  const {
    type,
    name,
    duration,
    description,
    sets,
    reps,
    weight,
    mediaList,
    setName,
    setDuration,
    setDescription,
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

      {/* Line 1: Type, Name, Seconds */}
      <CoreFields
        type={type}
        name={name}
        duration={duration}
        setName={setName}
        setDuration={setDuration}
        handleTypeChange={handleTypeChange}
      />

      {/* Line 2: Exercise or Learning specific fields */}
      {type === 'exercise' ? (
        <AddExerciseFields
          sets={sets}
          reps={reps}
          weight={weight}
          setSets={setSets}
          setReps={setReps}
          setWeight={setWeight}
        />
      ) : type === 'learning' ? (
        <div className="w-full">
          <label htmlFor={descriptionId} className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
            Description
          </label>
          <input
            id={descriptionId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Focus on keeping your back flat"
            className="demo-input py-1.5 text-xs font-medium"
          />
        </div>
      ) : null}

      {type === 'exercise' && (
        <div className="border-t border-line/35 pt-3">
          <label className="block text-3xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
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
