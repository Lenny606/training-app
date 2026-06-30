import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  daysPerWeek: integer('days_per_week').notNull(),
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

export type PlanRow = typeof plans.$inferSelect
export type ActivityRow = typeof activities.$inferSelect
