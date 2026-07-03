import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(), // jti — matches the claim in the refresh JWT
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // null = still valid
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  daysPerWeek: integer('days_per_week').notNull(),
  position: integer('position').notNull().default(0), // pořadí v sidebaru
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(), // pořadí v plánu
  name: text('name').notNull(),
  duration: integer('duration').notNull(), // sekundy
  type: text('type', { enum: ['exercise', 'rest'] }).notNull(),
  sets: integer('sets'),
  reps: text('reps'),
  weight: text('weight'),
})

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityId: text('activity_id').references(() => activities.id, {
    onDelete: 'cascade',
  }),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ---------------------------------------------------------------------------
// AI Chat history
// ---------------------------------------------------------------------------

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  // Serialised JSON array of UIMessage parts (for tool calls, thinking, etc.)
  parts: text('parts'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ---------------------------------------------------------------------------
// Workout logs — history of completed workout sessions
// ---------------------------------------------------------------------------

export const workoutLogs = sqliteTable('workout_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  /** Duration of the actual session in seconds */
  durationSeconds: integer('duration_seconds').notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  /** Optional free-text notes from the user / AI */
  notes: text('notes'),
})

export const workoutActivityLogs = sqliteTable('workout_activity_logs', {
  id: text('id').primaryKey(),
  workoutLogId: text('workout_log_id')
    .notNull()
    .references(() => workoutLogs.id, { onDelete: 'cascade' }),
  activityId: text('activity_id').references(() => activities.id, {
    onDelete: 'set null',
  }),
  /** Activity name snapshot — preserved even if the activity is later deleted */
  activityName: text('activity_name').notNull(),
  setsCompleted: integer('sets_completed'),
  reps: text('reps'),
  weight: text('weight'),
})

export type PlanRow = typeof plans.$inferSelect
export type ActivityRow = typeof activities.$inferSelect
export type UserRow = typeof users.$inferSelect
export type RefreshTokenRow = typeof refreshTokens.$inferSelect
export type MediaRow = typeof media.$inferSelect
export type ChatSessionRow = typeof chatSessions.$inferSelect
export type ChatMessageRow = typeof chatMessages.$inferSelect
export type WorkoutLogRow = typeof workoutLogs.$inferSelect
export type WorkoutActivityLogRow = typeof workoutActivityLogs.$inferSelect
