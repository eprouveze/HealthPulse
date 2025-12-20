/**
 * Import health data from Apple Health export XML
 * Imports: weight, daily steps, workouts, sleep, resting heart rate, workout routes,
 *          body composition, VO2Max, flights climbed
 *
 * Usage: npx tsx scripts/import-apple-health.ts [/path/to/export.xml]
 * Default: imports/apple_health_export/export.xml
 */

import Database from "better-sqlite3";
import { createReadStream, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { createInterface } from "readline";
import path from "path";

const xmlPath = process.argv[2] || path.join(process.cwd(), "imports", "apple_health_export", "export.xml");
const routesDir = path.join(path.dirname(xmlPath), "workout-routes");

// Haversine formula to calculate distance between two GPS points
function haversineDistance(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
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

  CREATE TABLE IF NOT EXISTS daily_sleep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    sleep_start TEXT NOT NULL,
    sleep_end TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    in_bed_minutes REAL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_daily_sleep_date ON daily_sleep(date);

  CREATE TABLE IF NOT EXISTS resting_heart_rate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    bpm INTEGER NOT NULL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_resting_heart_rate_date ON resting_heart_rate(date);

  CREATE TABLE IF NOT EXISTS workout_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    distance_km REAL,
    route_data TEXT NOT NULL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_workout_routes_date ON workout_routes(date);

  CREATE TABLE IF NOT EXISTS body_composition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    body_fat_percentage REAL NOT NULL,
    lean_body_mass_kg REAL NOT NULL,
    bmi REAL,
    source TEXT DEFAULT 'masaru',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date);

  CREATE TABLE IF NOT EXISTS vo2max (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    vo2max REAL NOT NULL,
    source TEXT DEFAULT 'apple_health',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_vo2max_date ON vo2max(date);
`);

// Add calories column to workouts if it doesn't exist
try {
  db.exec(`ALTER TABLE workouts ADD COLUMN calories_kcal REAL`);
} catch (e) {
  // Column already exists, ignore
}

// Add flights_climbed column to daily_steps if it doesn't exist
try {
  db.exec(`ALTER TABLE daily_steps ADD COLUMN flights_climbed INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists, ignore
}

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
  INSERT OR IGNORE INTO workouts (date, activity_type, duration_minutes, distance_km, calories_kcal, source, created_at)
  VALUES (?, ?, ?, ?, ?, 'apple_health', datetime('now'))
`);

// Add unique constraint to workouts if not exists
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_unique
  ON workouts(date, activity_type, duration_minutes, COALESCE(distance_km, 0))
`);

const insertSleep = db.prepare(`
  INSERT OR REPLACE INTO daily_sleep (date, sleep_start, sleep_end, duration_minutes, in_bed_minutes, source, created_at)
  VALUES (?, ?, ?, ?, ?, 'apple_health', datetime('now'))
`);

const insertRestingHR = db.prepare(`
  INSERT OR REPLACE INTO resting_heart_rate (date, bpm, source, created_at)
  VALUES (?, ?, 'apple_health', datetime('now'))
`);

const insertWorkoutRoute = db.prepare(`
  INSERT OR IGNORE INTO workout_routes (date, activity_type, duration_minutes, distance_km, route_data, source, created_at)
  VALUES (?, ?, ?, ?, ?, 'apple_health', datetime('now'))
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_routes_unique
  ON workout_routes(date, activity_type, duration_minutes)
`);

const insertBodyComp = db.prepare(`
  INSERT OR REPLACE INTO body_composition (date, body_fat_percentage, lean_body_mass_kg, source, created_at)
  VALUES (?, ?, ?, 'masaru', datetime('now'))
`);

const insertVO2Max = db.prepare(`
  INSERT OR REPLACE INTO vo2max (date, vo2max, source, created_at)
  VALUES (?, ?, 'apple_health', datetime('now'))
`);

const updateFlightsClimbed = db.prepare(`
  UPDATE daily_steps SET flights_climbed = ? WHERE date = ?
`);

// Regex patterns
const weightRegex = /type="HKQuantityTypeIdentifierBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const stepRegex = /type="HKQuantityTypeIdentifierStepCount"[^>]*sourceName="([^"]*)"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const workoutRegex = /workoutActivityType="([^"]+)"[^>]*duration="([^"]+)"[^>]*startDate="([^"]+)"/;
const distanceRegex = /type="HKQuantityTypeIdentifierDistanceWalkingRunning"[^>]*sum="([^"]+)"/;
const caloriesRegex = /type="HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*sum="([^"]+)"/;
const sleepRegex = /type="HKCategoryTypeIdentifierSleepAnalysis"[^>]*startDate="([^"]+)"[^>]*endDate="([^"]+)"[^>]*value="([^"]+)"/;
const restingHRRegex = /type="HKQuantityTypeIdentifierRestingHeartRate"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const bodyFatRegex = /type="HKQuantityTypeIdentifierBodyFatPercentage"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const leanMassRegex = /type="HKQuantityTypeIdentifierLeanBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const vo2maxRegex = /type="HKQuantityTypeIdentifierVO2Max"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const flightsClimbedRegex = /type="HKQuantityTypeIdentifierFlightsClimbed"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;

// Data collections
const weights: { date: string; weight: number; source: string }[] = [];
// Track steps by date AND source to avoid double-counting from multiple devices
const stepsByDateAndSource: Map<string, Map<string, number>> = new Map(); // date -> (source -> steps)
const workouts: { date: string; type: string; duration: number; distance: number | null; calories: number | null }[] = [];
// Sleep records by night (keyed by end date)
const sleepByDate: Map<string, { start: string; end: string; inBedMins: number; asleepMins: number }> = new Map();
// Resting heart rate by date
const restingHRByDate: Map<string, number> = new Map();
// Body composition by date
const bodyCompByDate: Map<string, { fat: number; lean: number }> = new Map();
// VO2Max by date (keep latest value per day)
const vo2maxByDate: Map<string, number> = new Map();
// Flights climbed by date (sum per day)
const flightsByDate: Map<string, number> = new Map();

let currentWorkout: { date: string; type: string; duration: number; distance: number | null; calories: number | null } | null = null;
let weightCount = 0;
let stepCount = 0;
let workoutCount = 0;
let sleepCount = 0;
let restingHRCount = 0;
let bodyCompCount = 0;
let vo2maxCount = 0;
let flightsCount = 0;

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
      currentWorkout = { date, type, duration, distance: null, calories: null };
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

  // Parse workout calories (appears in WorkoutStatistics after Workout)
  if (currentWorkout && line.includes("WorkoutStatistics") && line.includes("ActiveEnergyBurned")) {
    const match = line.match(caloriesRegex);
    if (match) {
      currentWorkout.calories = Math.round(parseFloat(match[1]));
    }
  }

  // End of workout element - save it
  if (currentWorkout && (line.includes("</Workout>") || (line.includes("<Workout") && !line.includes(currentWorkout.date)))) {
    workouts.push(currentWorkout);
    currentWorkout = null;
  }

  // Parse sleep records
  if (line.includes("HKCategoryTypeIdentifierSleepAnalysis")) {
    const match = line.match(sleepRegex);
    if (match) {
      const [, startDateStr, endDateStr, valueType] = match;
      const endDate = endDateStr.split(" ")[0]; // Use end date as the "night" date
      // Fix date format: "2016-12-16 00:06:56 +0900" -> "2016-12-16T00:06:56+0900"
      const fixDate = (s: string) => s.replace(" ", "T").replace(" +", "+").replace(" -", "-");
      const startTime = new Date(fixDate(startDateStr));
      const endTime = new Date(fixDate(endDateStr));
      const durationMins = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      const isAsleep = valueType.includes("Asleep");
      const isInBed = valueType.includes("InBed");

      if (!sleepByDate.has(endDate)) {
        sleepByDate.set(endDate, { start: startDateStr, end: endDateStr, inBedMins: 0, asleepMins: 0 });
      }
      const sleep = sleepByDate.get(endDate)!;

      // Track earliest start and latest end
      if (startDateStr < sleep.start) sleep.start = startDateStr;
      if (endDateStr > sleep.end) sleep.end = endDateStr;

      if (isInBed) sleep.inBedMins += durationMins;
      if (isAsleep) sleep.asleepMins += durationMins;

      sleepCount++;
    }
  }

  // Parse resting heart rate
  if (line.includes("HKQuantityTypeIdentifierRestingHeartRate")) {
    const match = line.match(restingHRRegex);
    if (match) {
      const [, startDateStr, valueStr] = match;
      const date = startDateStr.split(" ")[0];
      const bpm = parseInt(valueStr, 10);
      // Keep latest value for the day
      restingHRByDate.set(date, bpm);
      restingHRCount++;
    }
  }

  // Parse body fat percentage (convert from 0.326 to 32.6%)
  if (line.includes("HKQuantityTypeIdentifierBodyFatPercentage")) {
    const match = line.match(bodyFatRegex);
    if (match) {
      const [, startDateStr, valueStr] = match;
      const date = startDateStr.split(" ")[0];
      const fatPct = parseFloat(valueStr) * 100; // Convert to percentage
      if (!bodyCompByDate.has(date)) {
        bodyCompByDate.set(date, { fat: 0, lean: 0 });
      }
      bodyCompByDate.get(date)!.fat = fatPct;
      bodyCompCount++;
    }
  }

  // Parse lean body mass
  if (line.includes("HKQuantityTypeIdentifierLeanBodyMass") && line.includes('unit="kg"')) {
    const match = line.match(leanMassRegex);
    if (match) {
      const [, startDateStr, valueStr] = match;
      const date = startDateStr.split(" ")[0];
      const leanKg = parseFloat(valueStr);
      if (!bodyCompByDate.has(date)) {
        bodyCompByDate.set(date, { fat: 0, lean: 0 });
      }
      bodyCompByDate.get(date)!.lean = leanKg;
    }
  }

  // Parse VO2Max (keep latest value per day)
  if (line.includes("HKQuantityTypeIdentifierVO2Max")) {
    const match = line.match(vo2maxRegex);
    if (match) {
      const [, startDateStr, valueStr] = match;
      const date = startDateStr.split(" ")[0];
      const vo2max = parseFloat(valueStr);
      // Keep latest value for the day
      vo2maxByDate.set(date, vo2max);
      vo2maxCount++;
    }
  }

  // Parse Flights Climbed (sum per day)
  if (line.includes("HKQuantityTypeIdentifierFlightsClimbed")) {
    const match = line.match(flightsClimbedRegex);
    if (match) {
      const [, startDateStr, valueStr] = match;
      const date = startDateStr.split(" ")[0];
      const flights = parseInt(valueStr, 10);
      flightsByDate.set(date, (flightsByDate.get(date) || 0) + flights);
      flightsCount++;
    }
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

  // Parse GPX workout routes
  const workoutRoutes: { date: string; type: string; duration: number; distance: number | null; routeData: string }[] = [];
  if (existsSync(routesDir)) {
    const gpxFiles = readdirSync(routesDir).filter(f => f.endsWith('.gpx'));
    console.log(`\nParsing ${gpxFiles.length} GPX route files...`);

    for (const gpxFile of gpxFiles) {
      try {
        const gpxContent = readFileSync(path.join(routesDir, gpxFile), 'utf-8');
        // Extract date from filename: route_2020-09-10_12.32pm.gpx
        const dateMatch = gpxFile.match(/route_(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;

        const date = dateMatch[1];
        // Extract trackpoints
        const points: { lat: number; lon: number }[] = [];
        const trkptRegex = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"/g;
        let ptMatch;
        while ((ptMatch = trkptRegex.exec(gpxContent)) !== null) {
          points.push({ lon: parseFloat(ptMatch[1]), lat: parseFloat(ptMatch[2]) });
        }

        if (points.length > 0) {
          // Simplify route: keep every Nth point to reduce storage (aim for ~100 points max)
          const step = Math.max(1, Math.floor(points.length / 100));
          const simplified = points.filter((_, i) => i % step === 0 || i === points.length - 1);

          // Calculate approximate distance from points
          let totalDistanceKm = 0;
          for (let i = 1; i < points.length; i++) {
            totalDistanceKm += haversineDistance(points[i - 1], points[i]);
          }

          // Estimate duration from number of points (roughly 1 point per second)
          const durationMinutes = points.length / 60;

          workoutRoutes.push({
            date,
            type: 'walking', // Most routes are walking
            duration: Math.round(durationMinutes * 10) / 10,
            distance: Math.round(totalDistanceKm * 100) / 100,
            routeData: JSON.stringify(simplified),
          });
        }
      } catch (err) {
        // Skip invalid GPX files
      }
    }
  }

  console.log(`\nFound:`);
  console.log(`  - ${weightCount} weight records`);
  console.log(`  - ${stepCount} step records from ${stepsByDateAndSource.size} unique days`);
  console.log(`  - ${workoutCount} workout records`);
  console.log(`  - ${sleepCount} sleep records from ${sleepByDate.size} unique nights`);
  console.log(`  - ${restingHRCount} resting HR records from ${restingHRByDate.size} unique days`);
  console.log(`  - ${bodyCompCount} body composition records from ${bodyCompByDate.size} unique days`);
  console.log(`  - ${vo2maxCount} VO2Max records from ${vo2maxByDate.size} unique days`);
  console.log(`  - ${flightsCount} flights climbed records from ${flightsByDate.size} unique days`);
  console.log(`  - ${workoutRoutes.length} workout routes with GPS data`);
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
      insertWorkout.run(workout.date, workout.type, workout.duration, workout.distance, workout.calories);
    }

    // Insert sleep data
    for (const [date, sleep] of sleepByDate) {
      // Use asleep time if available, otherwise in-bed time
      const durationMins = sleep.asleepMins > 0 ? sleep.asleepMins : sleep.inBedMins;
      if (durationMins > 0) {
        insertSleep.run(date, sleep.start, sleep.end, durationMins, sleep.inBedMins || null);
      }
    }

    // Insert resting heart rate
    for (const [date, bpm] of restingHRByDate) {
      insertRestingHR.run(date, bpm);
    }

    // Insert body composition
    for (const [date, comp] of bodyCompByDate) {
      // Only insert if we have both fat and lean measurements
      if (comp.fat > 0 && comp.lean > 0) {
        insertBodyComp.run(date, comp.fat, comp.lean);
      }
    }

    // Insert workout routes
    for (const route of workoutRoutes) {
      insertWorkoutRoute.run(route.date, route.type, route.duration, route.distance, route.routeData);
    }

    // Insert VO2Max
    for (const [date, vo2max] of vo2maxByDate) {
      insertVO2Max.run(date, vo2max);
    }

    // Update flights climbed on existing daily_steps records
    for (const [date, flights] of flightsByDate) {
      updateFlightsClimbed.run(flights, date);
    }
  });

  insertAll();

  // Count valid body composition entries
  const validBodyComp = Array.from(bodyCompByDate.values()).filter(c => c.fat > 0 && c.lean > 0).length;

  console.log(`\nImported:`);
  console.log(`  - ${weightInserts.length} weight days`);
  console.log(`  - ${steps.size} step days`);
  console.log(`  - ${workouts.length} workouts`);
  console.log(`  - ${sleepByDate.size} sleep nights`);
  console.log(`  - ${restingHRByDate.size} resting HR days`);
  console.log(`  - ${validBodyComp} body composition days`);
  console.log(`  - ${vo2maxByDate.size} VO2Max days`);
  console.log(`  - ${flightsByDate.size} days with flights climbed`);
  console.log(`  - ${workoutRoutes.length} workout routes`);

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
