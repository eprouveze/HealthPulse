import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const weights = sqliteTable("weights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date string YYYY-MM-DD
  weightKg: real("weight_kg").notNull(),
  source: text("source").default("manual"), // 'manual', 'apple_health', 'masaru'
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetWeight: real("target_weight").notNull(),
  targetDate: text("target_date"), // optional target date
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // One entry per day
  notes: text("notes"),
  energyLevel: integer("energy_level"), // 1-5
  fastingHours: real("fasting_hours"), // e.g., 16 for 16:8
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const dailySteps = sqliteTable("daily_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // One entry per day
  stepCount: integer("step_count").notNull(),
  source: text("source").default("apple_health"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const workouts = sqliteTable("workouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // Can have multiple workouts per day
  activityType: text("activity_type").notNull(), // walking, cycling, running, etc.
  durationMinutes: real("duration_minutes").notNull(),
  distanceKm: real("distance_km"),
  source: text("source").default("apple_health"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Types
export type Weight = typeof weights.$inferSelect;
export type NewWeight = typeof weights.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type DailyStep = typeof dailySteps.$inferSelect;
export type NewDailyStep = typeof dailySteps.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
