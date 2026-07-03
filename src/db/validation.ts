import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { activities, plans } from './schema'

/** Row-level insert schema for an activity (DB shape). */
export const activityInsert = createInsertSchema(activities, {
  duration: (s) => s.positive(),
  name: (s) => s.min(1),
})

/** Row-level insert schema for a plan (DB shape, without nested activities). */
export const planInsert = createInsertSchema(plans, {
  name: (s) => s.min(1),
  daysPerWeek: (s) => s.min(1).max(7),
})

/**
 * Domain-level schema used at the server-function boundary: a plan plus its
 * nested activities, mirroring `NewTrainingPlan`. IDs/positions are assigned by
 * the repository, so they are omitted here.
 */
export const mediaInput = z.object({
  id: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
})

export const activityInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  duration: z.number().positive(),
  type: z.enum(['exercise', 'rest']),
  sets: z.number().int().positive().optional(),
  reps: z.string().optional(),
  weight: z.string().optional(),
  media: z.array(mediaInput).optional(),
})

export const newPlanInput = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  daysPerWeek: z.number().min(1).max(7),
  activities: z.array(activityInput),
})

export type NewPlanInput = z.infer<typeof newPlanInput>
