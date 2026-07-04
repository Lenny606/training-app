import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { DEFAULT_ACTIVITY_DURATION } from '../domain/plans'
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
 * Tool/boundary-facing optional. LLMs routinely send an explicit `null` for
 * fields they leave out, which plain `.optional()` rejects — accept null and
 * normalize it to undefined so downstream code keeps its `T | undefined` shape.
 */
export const optionalish = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((v): z.output<T> | undefined => v ?? undefined)

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

// Only `name` is required — duration falls back to the default when omitted
// (or sent as null), everything else may stay empty.
export const activityInput = z.object({
  id: optionalish(z.string()),
  name: z.string().trim().min(1),
  duration: z
    .number()
    .positive()
    .nullish()
    .transform((v) => v ?? DEFAULT_ACTIVITY_DURATION),
  type: z.enum(['exercise', 'rest']),
  sets: optionalish(z.number().int().positive()),
  reps: optionalish(z.string()),
  weight: optionalish(z.string()),
  media: optionalish(z.array(mediaInput)),
})

export const newPlanInput = z.object({
  name: z.string().min(1),
  description: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  daysPerWeek: z.number().min(1).max(7),
  activities: z.array(activityInput),
})

/** Patch shape for plan updates: every field optional, nulls treated as omitted. */
export const planPatchInput = z.object({
  name: optionalish(z.string().min(1)),
  description: optionalish(z.string()),
  daysPerWeek: optionalish(z.number().min(1).max(7)),
  activities: optionalish(z.array(activityInput)),
})

export type NewPlanInput = z.infer<typeof newPlanInput>
