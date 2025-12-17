/**
 * Import health data from Apple Health export XML
 * Imports: weight, daily steps, workouts (walking, cycling, etc.)
 *
 * Usage: npx tsx scripts/import-apple-health.ts /path/to/export.xml
 */

import Database from "better-sqlite3";
import { createReadStream, copyFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";

const xmlPath = process.argv[2] || "/tmp/health_export/apple_health_export/export.xml";
const dbPath = path.join(process.cwd(), "weight-tracker.db");
const backupDir = path.join(process.cwd(), "backups");

// Create backup before import
if (existsSync(dbPath)) {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(backupDir, `weight-tracker-${timestamp}.db`);
  copyFileSync(dbPath, backupPath);
  console.log(`Backup created: ${backupPath}`);
}

console.log(`Importing from: ${xmlPath}`);
console.log(`Database: ${dbPath}`);

// Initialize database
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date);

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_weight REAL NOT NULL,
    target_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    notes TEXT,
    energy_level INTEGER,
    fasting_hours REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    step_count INTEGER NOT NULL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_daily_steps_date ON daily_steps(date);

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    distance_km REAL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
`);

// Prepare insert statements
const insertWeight = db.prepare(`
  INSERT OR REPLACE INTO weights (date, weight_kg, source, created_at)
  VALUES (?, ?, ?, datetime('now'))
`);

// Add unique constraint to weights if not exists
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_weights_unique ON weights(date)
`);

const insertSteps = db.prepare(`
  INSERT OR REPLACE INTO daily_steps (date, step_count, source, created_at)
  VALUES (?, ?, 'apple_health', datetime('now'))
`);

const insertWorkout = db.prepare(`
  INSERT OR IGNORE INTO workouts (date, activity_type, duration_minutes, distance_km, source, created_at)
  VALUES (?, ?, ?, ?, 'apple_health', datetime('now'))
`);

// Add unique constraint to workouts if not exists
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_unique
  ON workouts(date, activity_type, duration_minutes, COALESCE(distance_km, 0))
`);

// Regex patterns
const weightRegex = /type="HKQuantityTypeIdentifierBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const stepRegex = /type="HKQuantityTypeIdentifierStepCount"[^>]*sourceName="([^"]*)"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const workoutRegex = /workoutActivityType="([^"]+)"[^>]*duration="([^"]+)"[^>]*startDate="([^"]+)"/;
const distanceRegex = /type="HKQuantityTypeIdentifierDistanceWalkingRunning"[^>]*sum="([^"]+)"/;

// Data collections
const weights: { date: string; weight: number; source: string }[] = [];
// Track steps by date AND source to avoid double-counting from multiple devices
const stepsByDateAndSource: Map<string, Map<string, number>> = new Map(); // date -> (source -> steps)
const workouts: { date: string; type: string; duration: number; distance: number | null }[] = [];

let currentWorkout: { date: string; type: string; duration: number; distance: number | null } | null = null;
let weightCount = 0;
let stepCount = 0;
let workoutCount = 0;

const rl = createInterface({
  input: createReadStream(xmlPath),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  // Parse weight records
  if (line.includes("HKQuantityTypeIdentifierBodyMass") && line.includes('unit="kg"')) {
    const match = line.match(weightRegex);
    if (match) {
      const [, dateTimeStr, valueStr] = match;
      const date = dateTimeStr.split(" ")[0];
      const weight = parseFloat(valueStr);
      let source = "apple_health";
      if (line.includes("MASARU")) {
        source = "masaru";
      }
      weights.push({ date, weight, source });
      weightCount++;
    }
  }

  // Parse step count records - track by source to avoid double-counting
  if (line.includes("HKQuantityTypeIdentifierStepCount")) {
    const match = line.match(stepRegex);
    if (match) {
      const [, sourceName, dateTimeStr, valueStr] = match;
      const date = dateTimeStr.split(" ")[0];
      const stepValue = parseInt(valueStr, 10);
      // Aggregate steps by date AND source
      if (!stepsByDateAndSource.has(date)) {
        stepsByDateAndSource.set(date, new Map());
      }
      const sourceMap = stepsByDateAndSource.get(date)!;
      sourceMap.set(sourceName, (sourceMap.get(sourceName) || 0) + stepValue);
      stepCount++;
    }
  }

  // Parse workout records
  if (line.includes("<Workout") && line.includes("workoutActivityType")) {
    const match = line.match(workoutRegex);
    if (match) {
      const [, activityType, durationStr, dateTimeStr] = match;
      const date = dateTimeStr.split(" ")[0];
      const duration = parseFloat(durationStr);
      // Map activity type to simple name
      const typeMap: Record<string, string> = {
        "HKWorkoutActivityTypeWalking": "walking",
        "HKWorkoutActivityTypeCycling": "cycling",
        "HKWorkoutActivityTypeRunning": "running",
        "HKWorkoutActivityTypeSwimming": "swimming",
        "HKWorkoutActivityTypeElliptical": "elliptical",
        "HKWorkoutActivityTypeTraditionalStrengthTraining": "strength",
        "HKWorkoutActivityTypeOther": "other",
      };
      const type = typeMap[activityType] || activityType.replace("HKWorkoutActivityType", "").toLowerCase();
      currentWorkout = { date, type, duration, distance: null };
      workoutCount++;
    }
  }

  // Parse workout distance (appears in WorkoutStatistics after Workout)
  if (currentWorkout && line.includes("WorkoutStatistics") && line.includes("DistanceWalkingRunning")) {
    const match = line.match(distanceRegex);
    if (match) {
      currentWorkout.distance = parseFloat(match[1]);
    }
  }

  // End of workout element - save it
  if (currentWorkout && (line.includes("</Workout>") || (line.includes("<Workout") && !line.includes(currentWorkout.date)))) {
    workouts.push(currentWorkout);
    currentWorkout = null;
  }
});

rl.on("close", () => {
  // Save any remaining workout
  if (currentWorkout) {
    workouts.push(currentWorkout);
  }

  // Calculate deduplicated steps: pick max single-source count per date
  // This avoids double-counting when multiple devices (iPhone + Watch) track same steps
  const steps: Map<string, number> = new Map();
  for (const [date, sourceMap] of stepsByDateAndSource) {
    // Pick the highest count from any single source for this date
    const maxSteps = Math.max(...Array.from(sourceMap.values()));
    steps.set(date, maxSteps);
  }

  console.log(`\nFound:`);
  console.log(`  - ${weightCount} weight records`);
  console.log(`  - ${stepCount} step records from ${stepsByDateAndSource.size} unique days`);
  console.log(`  - ${workoutCount} workout records`);
  console.log(`  - (Using max single-source steps per day to avoid double-counting)`);

  // Process and insert weights
  const weightByDate = new Map<string, { weights: number[]; source: string }>();
  for (const w of weights) {
    if (weightByDate.has(w.date)) {
      weightByDate.get(w.date)!.weights.push(w.weight);
    } else {
      weightByDate.set(w.date, { weights: [w.weight], source: w.source });
    }
  }

  const weightInserts: [string, number, string][] = [];
  for (const [date, data] of weightByDate) {
    const avgWeight = data.weights.reduce((a, b) => a + b, 0) / data.weights.length;
    weightInserts.push([date, Math.round(avgWeight * 10) / 10, data.source]);
  }
  weightInserts.sort((a, b) => a[0].localeCompare(b[0]));

  // Insert all data in a transaction
  const insertAll = db.transaction(() => {
    // Insert weights
    for (const [date, weight, source] of weightInserts) {
      insertWeight.run(date, weight, source);
    }

    // Insert daily steps
    for (const [date, totalSteps] of steps) {
      insertSteps.run(date, totalSteps);
    }

    // Insert workouts
    for (const workout of workouts) {
      insertWorkout.run(workout.date, workout.type, workout.duration, workout.distance);
    }
  });

  insertAll();

  console.log(`\nImported:`);
  console.log(`  - ${weightInserts.length} weight days`);
  console.log(`  - ${steps.size} step days`);
  console.log(`  - ${workouts.length} workouts`);

  // Show date ranges
  if (weightInserts.length > 0) {
    console.log(`\nWeight range: ${weightInserts[0][0]} to ${weightInserts[weightInserts.length - 1][0]}`);
  }

  const stepDates = Array.from(steps.keys()).sort();
  if (stepDates.length > 0) {
    console.log(`Steps range: ${stepDates[0]} to ${stepDates[stepDates.length - 1]}`);
  }

  const workoutDates = workouts.map(w => w.date).sort();
  if (workoutDates.length > 0) {
    console.log(`Workouts range: ${workoutDates[0]} to ${workoutDates[workoutDates.length - 1]}`);
  }

  // Show workout breakdown
  const workoutsByType = new Map<string, number>();
  for (const w of workouts) {
    workoutsByType.set(w.type, (workoutsByType.get(w.type) || 0) + 1);
  }
  console.log(`\nWorkout breakdown:`);
  for (const [type, count] of Array.from(workoutsByType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${type}: ${count}`);
  }

  db.close();
});
