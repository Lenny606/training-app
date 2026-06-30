export interface Activity {
  id: string
  name: string
  duration: number // in seconds
  sets?: number
  reps?: string // e.g. "8-10" or "10"
  weight?: string // e.g. "80 kg" or "15 kg"
  type: 'exercise' | 'rest'
}

export interface TrainingPlan {
  id: string
  name: string
  description: string
  daysPerWeek: number
  activities: Activity[]
}

/** An activity before persistence: `id` is assigned by the repository if absent. */
export type NewActivity = Omit<Activity, 'id'> & { id?: string }

export interface NewTrainingPlan {
  name: string
  description: string
  daysPerWeek: number
  activities: NewActivity[]
}

export const DEFAULT_PLANS: TrainingPlan[] = [
  {
    id: 'push-legs-split',
    name: 'Push/Pull/Legs - Day 1: Push',
    description: 'Hypertrophy focused chest, shoulders, and triceps program.',
    daysPerWeek: 3,
    activities: [
      {
        id: 'bench-press',
        name: 'Barbell Bench Press',
        duration: 180,
        sets: 4,
        reps: '8-10',
        weight: '80 kg',
        type: 'exercise',
      },
      {
        id: 'rest-1',
        name: 'Rest',
        duration: 90,
        type: 'rest',
      },
      {
        id: 'incline-press',
        name: 'Incline Dumbbell Press',
        duration: 150,
        sets: 3,
        reps: '10',
        weight: '26 kg',
        type: 'exercise',
      },
      {
        id: 'rest-2',
        name: 'Rest',
        duration: 90,
        type: 'rest',
      },
      {
        id: 'overhead-press',
        name: 'Overhead Dumbbell Press',
        duration: 120,
        sets: 3,
        reps: '10',
        weight: '20 kg',
        type: 'exercise',
      },
      {
        id: 'lateral-raise',
        name: 'Lateral Raises',
        duration: 90,
        sets: 4,
        reps: '12',
        weight: '10 kg',
        type: 'exercise',
      },
    ],
  },
  {
    id: 'deadlift-531',
    name: '5/3/1 Strength Program - Deadlift',
    description: 'Heavy strength development session targeting lower body power.',
    daysPerWeek: 4,
    activities: [
      {
        id: 'deadlift-heavy',
        name: 'Deadlift (Main Lift)',
        duration: 240,
        sets: 5,
        reps: '5',
        weight: '140 kg',
        type: 'exercise',
      },
      {
        id: 'rest-dl-1',
        name: 'Rest',
        duration: 180,
        type: 'rest',
      },
      {
        id: 'romanian-dl',
        name: 'Romanian Deadlift',
        duration: 150,
        sets: 3,
        reps: '8',
        weight: '100 kg',
        type: 'exercise',
      },
      {
        id: 'rest-dl-2',
        name: 'Rest',
        duration: 120,
        type: 'rest',
      },
    ],
  },
  {
    id: 'hiit-endurance',
    name: 'HIIT & Endurance Cardio',
    description: 'High-intensity interval training session for cardiovascular conditioning.',
    daysPerWeek: 2,
    activities: [
      {
        id: 'jumping-jacks',
        name: 'Jumping Jacks',
        duration: 45,
        type: 'exercise',
      },
      {
        id: 'hiit-rest-1',
        name: 'Rest',
        duration: 15,
        type: 'rest',
      },
      {
        id: 'burpees',
        name: 'Burpees (High Intensity)',
        duration: 45,
        type: 'exercise',
      },
      {
        id: 'hiit-rest-2',
        name: 'Rest',
        duration: 15,
        type: 'rest',
      },
      {
        id: 'mountain-climbers',
        name: 'Mountain Climbers',
        duration: 45,
        type: 'exercise',
      },
      {
        id: 'hiit-rest-3',
        name: 'Rest',
        duration: 60,
        type: 'rest',
      },
    ],
  },
]
