/**
 * Generate realistic demo data for screenshots
 * Usage: npx tsx scripts/generate-demo-data.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/schema";

const DEMO_DB_PATH = "demo-weight-tracker.db";

// Create fresh demo database
const sqlite = new Database(DEMO_DB_PATH);
const db = drizzle(sqlite, { schema });

// Helper to format dates
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

// Generate dates for the last N days
function getDatesBack(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
}

async function generateDemoData() {
  console.log("Creating demo database schema...");

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_weight REAL NOT NULL,
      target_date TEXT,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      notes TEXT,
      energy_level INTEGER,
      fasting_hours REAL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      step_count INTEGER NOT NULL,
      flights_climbed INTEGER DEFAULT 0,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      duration_minutes REAL NOT NULL,
      distance_km REAL,
      calories_kcal REAL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_sleep (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      sleep_start TEXT NOT NULL,
      sleep_end TEXT NOT NULL,
      duration_minutes REAL NOT NULL,
      in_bed_minutes REAL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resting_heart_rate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      bpm INTEGER NOT NULL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      duration_minutes REAL NOT NULL,
      distance_km REAL,
      route_data TEXT NOT NULL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_composition (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      body_fat_percentage REAL NOT NULL,
      lean_body_mass_kg REAL NOT NULL,
      bmi REAL,
      source TEXT DEFAULT 'masaru',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vo2max (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      vo2max REAL NOT NULL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS heart_rate_variability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      hrv_sdnn_ms REAL NOT NULL,
      source TEXT DEFAULT 'apple_health',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nutrition_sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sprint_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      item TEXT NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL,
      ai_estimated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const dates = getDatesBack(730); // ~2 years of data

  console.log("Generating weight data...");
  // Weight: Start at 95kg, trend down to 82kg with realistic fluctuations
  const weightStmt = sqlite.prepare(
    "INSERT INTO weights (date, weight_kg, source, created_at) VALUES (?, ?, ?, ?)"
  );

  let baseWeight = 95;
  const targetWeight = 82;
  const totalDays = dates.length;

  for (let i = 0; i < dates.length; i++) {
    // Skip some days randomly (not everyone weighs daily)
    if (Math.random() < 0.3) continue;

    // Gradual downward trend
    const progress = i / totalDays;
    const trendWeight = baseWeight - (baseWeight - targetWeight) * progress * 0.9;

    // Add daily fluctuation (+/- 0.8kg)
    const fluctuation = randomBetween(-0.8, 0.8);

    // Add weekly pattern (higher on weekends)
    const dayOfWeek = new Date(dates[i]).getDay();
    const weekendBump = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 0;

    const weight = Math.round((trendWeight + fluctuation + weekendBump) * 10) / 10;

    weightStmt.run(dates[i], weight, "apple_health", now);
  }

  console.log("Generating goal...");
  sqlite.prepare(
    "INSERT INTO goals (target_weight, target_date, created_at, is_active) VALUES (?, ?, ?, ?)"
  ).run(80, formatDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), now, 1);

  console.log("Generating daily steps...");
  const stepsStmt = sqlite.prepare(
    "INSERT INTO daily_steps (date, step_count, flights_climbed, source, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay();
    // Less steps on weekends
    const baseSteps = (dayOfWeek === 0 || dayOfWeek === 6) ? 5000 : 8000;
    const steps = randomInt(baseSteps - 2000, baseSteps + 4000);
    const flights = randomInt(0, 15);
    stepsStmt.run(date, steps, flights, "apple_health", now);
  }

  console.log("Generating workouts...");
  const workoutStmt = sqlite.prepare(
    "INSERT INTO workouts (date, activity_type, duration_minutes, distance_km, calories_kcal, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  for (const date of dates) {
    // ~60% chance of a workout
    if (Math.random() < 0.4) continue;

    // Sometimes multiple workouts per day
    const numWorkouts = Math.random() < 0.1 ? 2 : 1;

    for (let w = 0; w < numWorkouts; w++) {
      const distance = randomBetween(1.5, 5);
      const duration = distance * randomBetween(12, 18); // 12-18 min per km
      const calories = distance * randomBetween(70, 90);

      workoutStmt.run(
        date,
        "walking",
        Math.round(duration),
        Math.round(distance * 10) / 10,
        Math.round(calories),
        "apple_health",
        now
      );
    }
  }

  console.log("Generating resting heart rate...");
  const hrStmt = sqlite.prepare(
    "INSERT INTO resting_heart_rate (date, bpm, source, created_at) VALUES (?, ?, ?, ?)"
  );

  // HR trends down as fitness improves
  for (let i = 0; i < dates.length; i++) {
    const progress = i / dates.length;
    const baseHR = 72 - (progress * 8); // 72 -> 64 over time
    const hr = Math.round(baseHR + randomBetween(-3, 3));
    hrStmt.run(dates[i], hr, "apple_health", now);
  }

  console.log("Generating body composition...");
  const bodyStmt = sqlite.prepare(
    "INSERT INTO body_composition (date, body_fat_percentage, lean_body_mass_kg, bmi, source, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  // Weekly body comp measurements
  for (let i = 0; i < dates.length; i += 7) {
    const progress = i / dates.length;
    const bodyFat = 32 - (progress * 8) + randomBetween(-0.5, 0.5); // 32% -> 24%
    const leanMass = 62 + (progress * 3) + randomBetween(-0.3, 0.3); // Slight muscle gain
    const weight = leanMass / (1 - bodyFat / 100);
    const bmi = weight / (1.75 * 1.75); // Assuming 175cm height

    bodyStmt.run(
      dates[i],
      Math.round(bodyFat * 10) / 10,
      Math.round(leanMass * 10) / 10,
      Math.round(bmi * 10) / 10,
      "masaru",
      now
    );
  }

  console.log("Generating VO2Max...");
  const vo2Stmt = sqlite.prepare(
    "INSERT INTO vo2max (date, vo2max, source, created_at) VALUES (?, ?, ?, ?)"
  );

  // Weekly VO2Max, improving over time
  for (let i = 0; i < dates.length; i += 7) {
    const progress = i / dates.length;
    const vo2 = 32 + (progress * 8) + randomBetween(-1, 1); // 32 -> 40
    vo2Stmt.run(dates[i], Math.round(vo2 * 10) / 10, "apple_health", now);
  }

  console.log("Generating HRV...");
  const hrvStmt = sqlite.prepare(
    "INSERT INTO heart_rate_variability (date, hrv_sdnn_ms, source, created_at) VALUES (?, ?, ?, ?)"
  );

  for (const date of dates) {
    const hrv = randomBetween(25, 55);
    hrvStmt.run(date, Math.round(hrv), "apple_health", now);
  }

  console.log("Generating sample workout routes...");
  const routeStmt = sqlite.prepare(
    "INSERT INTO workout_routes (date, activity_type, duration_minutes, distance_km, route_data, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  // Generate a few routes around a fictional park
  const baseLat = 35.6762; // Tokyo area
  const baseLon = 139.6503;

  for (let i = 0; i < 50; i++) {
    const dateIdx = randomInt(0, dates.length - 1);
    const points = [];
    let lat = baseLat + randomBetween(-0.01, 0.01);
    let lon = baseLon + randomBetween(-0.01, 0.01);

    // Generate a walking path
    for (let p = 0; p < 100; p++) {
      lat += randomBetween(-0.0003, 0.0003);
      lon += randomBetween(-0.0003, 0.0003);
      points.push({ lat, lon });
    }

    const distance = randomBetween(2, 5);
    const duration = distance * randomBetween(12, 16);

    routeStmt.run(
      dates[dateIdx],
      "walking",
      Math.round(duration),
      Math.round(distance * 10) / 10,
      JSON.stringify(points),
      "apple_health",
      now
    );
  }

  console.log("Generating daily entries...");
  const entryStmt = sqlite.prepare(
    "INSERT OR IGNORE INTO entries (date, notes, energy_level, fasting_hours, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  // Last 30 days of entries
  for (let i = 0; i < 30; i++) {
    const date = dates[dates.length - 1 - i];
    const energy = randomInt(3, 5);
    const fasting = Math.random() < 0.7 ? randomBetween(14, 18) : null;
    const notes = Math.random() < 0.3 ? ["Good workout today", "Feeling energetic", "Rest day", "Long walk in the park"][randomInt(0, 3)] : null;

    entryStmt.run(date, notes, energy, fasting, now);
  }

  console.log(`\nDemo database created: ${DEMO_DB_PATH}`);
  console.log("To use: mv weight-tracker.db weight-tracker.db.backup && mv demo-weight-tracker.db weight-tracker.db");
  console.log("To restore: mv weight-tracker.db demo-weight-tracker.db && mv weight-tracker.db.backup weight-tracker.db");

  sqlite.close();
}

generateDemoData().catch(console.error);
