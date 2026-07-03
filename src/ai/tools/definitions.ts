import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import { activityInput, newPlanInput } from '../../db/validation'

// Isomorphic tool *definitions* (name, description, Zod schemas). No server or
// DB code here, so they are safe to import from the client (e.g. to render tool
// calls) and reusable in tests. Server implementations bind these to a user in
// `tools/plans.ts` and `tools/workout.ts`.

const activityShape = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['exercise', 'rest']),
  duration: z.number(),
  sets: z.number().optional(),
  reps: z.string().optional(),
  weight: z.string().optional(),
})

const planShape = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  daysPerWeek: z.number(),
  activities: z.array(activityShape),
})

const planSummaryShape = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  daysPerWeek: z.number(),
  activityCount: z.number(),
})

/** Shared success-or-error result for the mutating plan tools. */
const planResult = z.object({
  plan: planShape.optional(),
  error: z.string().optional(),
})

export const listPlansDef = toolDefinition({
  name: 'list_plans',
  description:
    "List the signed-in user's training plans (id, name, description, days/week, activity count). Call this before referring to a plan by id.",
  inputSchema: z.object({}),
  outputSchema: z.object({ plans: z.array(planSummaryShape) }),
})

export const getPlanDef = toolDefinition({
  name: 'get_plan',
  description:
    'Fetch one full training plan by id, including all activities. Returns plan: null if no such plan exists for this user.',
  inputSchema: z.object({
    planId: z
      .string()
      .meta({ description: 'Plan id, e.g. one returned by list_plans' }),
  }),
  outputSchema: z.object({ plan: planShape.nullable() }),
})

export const summarizePlanDef = toolDefinition({
  name: 'summarize_plan',
  description:
    'Summarize a plan: total duration in seconds, exercise vs rest counts, and days per week.',
  inputSchema: z.object({ planId: z.string() }),
  outputSchema: z.object({
    found: z.boolean(),
    summary: z
      .object({
        name: z.string(),
        totalSeconds: z.number(),
        exerciseCount: z.number(),
        restCount: z.number(),
        daysPerWeek: z.number(),
      })
      .nullable(),
  }),
})

export const createPlanDef = toolDefinition({
  name: 'create_plan',
  description:
    'Create a new training plan for the user. Provide name, daysPerWeek (1-7), and an ordered activities array (each: name, type exercise|rest, duration seconds, optional sets/reps/weight).',
  inputSchema: newPlanInput,
  outputSchema: planResult,
})

export const updatePlanDef = toolDefinition({
  name: 'update_plan',
  description:
    'Update fields of an existing plan. Provide planId and a patch containing only the fields to change. Passing activities replaces the whole ordered list.',
  inputSchema: z.object({ planId: z.string(), patch: newPlanInput.partial() }),
  outputSchema: planResult,
})

export const addActivityDef = toolDefinition({
  name: 'add_activity',
  description:
    'Add a single activity to a plan and return the updated plan. Appends at the end unless a zero-based position is given.',
  inputSchema: z.object({
    planId: z.string(),
    activity: activityInput,
    position: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .meta({
        description: 'Zero-based insert index; omit to append at the end',
      }),
  }),
  outputSchema: planResult,
})

export const deletePlanDef = toolDefinition({
  name: 'delete_plan',
  description:
    'Permanently delete a plan. Destructive — the user must explicitly approve this before it runs.',
  inputSchema: z.object({ planId: z.string() }),
  outputSchema: z.object({ deleted: z.boolean(), id: z.string() }),
  needsApproval: true,
})

export const startWorkoutDef = toolDefinition({
  name: 'start_workout',
  description:
    'Start a workout for a plan. The app opens the timer with this plan preselected; the countdown itself is started by the user. Returns the plan id and name.',
  inputSchema: z.object({ planId: z.string() }),
  outputSchema: z.object({
    ok: z.boolean(),
    planId: z.string(),
    name: z.string().optional(),
    error: z.string().optional(),
  }),
})

// ---------------------------------------------------------------------------
// Workout Logging & Progress tools
// ---------------------------------------------------------------------------

const exerciseLogShape = z.object({
  activityId: z.string().optional().meta({
    description: 'Optional: the activity id from the plan if known.',
  }),
  activityName: z.string(),
  setsCompleted: z.number().int().nonnegative().optional(),
  reps: z.string().optional().meta({
    description: 'e.g. "8", "8-10", "AMRAP"',
  }),
  weight: z.string().optional().meta({
    description: 'e.g. "80kg", "bodyweight", "135 lbs"',
  }),
})

export const logWorkoutDef = toolDefinition({
  name: 'log_workout',
  description:
    'Save a completed workout session to the user\'s history. Call this after the user confirms a workout is done. Provide the plan id, actual duration in seconds, and optionally per-exercise performance data (weight, reps, sets).',
  inputSchema: z.object({
    planId: z.string(),
    durationSeconds: z.number().int().positive(),
    completedAt: z.string().datetime().meta({
      description: 'ISO 8601 datetime of when the workout finished. Use now() if not specified.',
    }),
    notes: z.string().optional(),
    exercises: z.array(exerciseLogShape).optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    logId: z.string().optional(),
    error: z.string().optional(),
  }),
})

const workoutSummaryShape = z.object({
  id: z.string(),
  planName: z.string(),
  durationSeconds: z.number(),
  completedAt: z.string(),
  notes: z.string().nullable(),
  exerciseCount: z.number(),
})

export const getWorkoutHistoryDef = toolDefinition({
  name: 'get_workout_history',
  description:
    'Fetch the user\'s recent workout history: which plans they trained, duration, and when. Optionally returns a weekly summary. Use this to answer questions like "how many workouts did I do this week?" or "what did I train last Tuesday?"',
  inputSchema: z.object({
    limit: z.number().int().positive().max(50).optional().meta({
      description: 'Max number of recent sessions to return (default 10).',
    }),
    includWeeklySummary: z.boolean().optional().meta({
      description: 'If true, also return a week-by-week session count and total duration.',
    }),
  }),
  outputSchema: z.object({
    sessions: z.array(workoutSummaryShape),
    weeklySummary: z.array(z.object({
      weekStart: z.string(),
      sessionCount: z.number(),
      totalSeconds: z.number(),
    })).optional(),
    recentCount: z.number().meta({
      description: 'Number of sessions in the last 7 days.',
    }),
  }),
})

export const getExerciseProgressDef = toolDefinition({
  name: 'get_exercise_progress',
  description:
    'Get the weight/reps progression for a specific exercise over recent sessions. Use this for questions like "what\'s my bench press trend?" or "am I getting stronger on squats?"',
  inputSchema: z.object({
    activityName: z.string().meta({
      description: 'Exact or approximate exercise name, e.g. "Bench Press", "Squat".',
    }),
    limit: z.number().int().positive().max(30).optional().meta({
      description: 'Max number of past entries to return (default 15).',
    }),
  }),
  outputSchema: z.object({
    activityName: z.string(),
    entries: z.array(z.object({
      completedAt: z.string(),
      setsCompleted: z.number().nullable(),
      reps: z.string().nullable(),
      weight: z.string().nullable(),
    })),
    hasData: z.boolean(),
  }),
})
