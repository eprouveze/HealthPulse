/**
 * Health digest for Lex session briefs.
 * Queries SQLite directly — no app running required.
 *
 * Usage:
 *   npx tsx scripts/health-digest.ts          # human-readable text
 *   npx tsx scripts/health-digest.ts --json   # JSON output
 *   npx tsx scripts/health-digest.ts --save   # write to docs/health-digest.md
 *
 * Typical cron: run nightly, output feeds into Lex session brief.
 */

import Database from "better-sqlite3";
import path from "path";
import { writeFileSync } from "fs";

const dbPath = path.join(process.cwd(), "weight-tracker.db");
const db = new Database(dbPath, { readonly: true });

const outputJson = process.argv.includes("--json");
const save = process.argv.includes("--save");

// --- helpers ---

function avg(rows: number[]): number | null {
  if (!rows.length) return null;
  return rows.reduce((a, b) => a + b, 0) / rows.length;
}

function trend(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return "";
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "→";
  return diff > 0 ? "↑" : "↓";
}

function ago(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const today = new Date().toISOString().split("T")[0];

// --- queries ---

// HRV: 7-day avg vs prior 7-day avg
const hrv7 = db
  .prepare(
    `
  SELECT hrv_sdnn_ms FROM heart_rate_variability
  WHERE date >= ? AND date <= ?
  ORDER BY date DESC
`,
  )
  .all(ago(7), today) as { hrv_sdnn_ms: number }[];

const hrv14 = db
  .prepare(
    `
  SELECT hrv_sdnn_ms FROM heart_rate_variability
  WHERE date >= ? AND date < ?
  ORDER BY date DESC
`,
  )
  .all(ago(14), ago(7)) as { hrv_sdnn_ms: number }[];

const hrvAvg = avg(hrv7.map((r) => r.hrv_sdnn_ms));
const hrvPrev = avg(hrv14.map((r) => r.hrv_sdnn_ms));

// Resting HR: yesterday
const rhrRow = db
  .prepare(
    `
  SELECT bpm FROM resting_heart_rate
  WHERE date <= ? ORDER BY date DESC LIMIT 1
`,
  )
  .get(today) as { bpm: number } | undefined;

// Steps: yesterday + 3-day avg
const stepsRows = db
  .prepare(
    `
  SELECT step_count FROM daily_steps
  WHERE date <= ? ORDER BY date DESC LIMIT 3
`,
  )
  .all(today) as { step_count: number }[];

const stepsYesterday = stepsRows[0]?.step_count ?? null;
const steps3Avg = avg(stepsRows.map((r) => r.step_count));

// Weight: 7-day trend (latest vs 7 days ago)
const weightRecent = db
  .prepare(
    `
  SELECT weight_kg, date FROM weights
  WHERE date <= ? ORDER BY date DESC LIMIT 1
`,
  )
  .get(today) as { weight_kg: number; date: string } | undefined;

const weight7Ago = db
  .prepare(
    `
  SELECT weight_kg FROM weights
  WHERE date <= ? ORDER BY date DESC LIMIT 1
`,
  )
  .get(ago(7)) as { weight_kg: number } | undefined;

const weightDelta7 =
  weightRecent && weight7Ago
    ? weightRecent.weight_kg - weight7Ago.weight_kg
    : null;

// Energy: last logged
const energyRow = db
  .prepare(
    `
  SELECT energy_level, date FROM entries
  WHERE energy_level IS NOT NULL
  ORDER BY date DESC LIMIT 1
`,
  )
  .get() as { energy_level: number; date: string } | undefined;

// VO2Max: latest
const vo2Row = db
  .prepare(
    `
  SELECT vo2max, date FROM vo2max
  ORDER BY date DESC LIMIT 1
`,
  )
  .get() as { vo2max: number; date: string } | undefined;

// Body comp: latest
const bodyRow = db
  .prepare(
    `
  SELECT body_fat_percentage, lean_body_mass_kg, date FROM body_composition
  ORDER BY date DESC LIMIT 1
`,
  )
  .get() as
  | { body_fat_percentage: number; lean_body_mass_kg: number; date: string }
  | undefined;

// Workouts: last 7 days
const workoutRows = db
  .prepare(
    `
  SELECT activity_type, duration_minutes, distance_km FROM workouts
  WHERE date >= ? AND date <= ?
  ORDER BY date DESC
`,
  )
  .all(ago(7), today) as {
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
}[];

db.close();

// --- format ---

const data = {
  date: today,
  hrv: {
    avg7d: hrvAvg ? Math.round(hrvAvg * 10) / 10 : null,
    avg7d_prev: hrvPrev ? Math.round(hrvPrev * 10) / 10 : null,
    trend: trend(hrvAvg, hrvPrev),
  },
  rhr: rhrRow?.bpm ?? null,
  steps: {
    yesterday: stepsYesterday,
    avg3d: steps3Avg ? Math.round(steps3Avg) : null,
  },
  weight: {
    latest: weightRecent?.weight_kg ?? null,
    date: weightRecent?.date ?? null,
    delta7d:
      weightDelta7 !== null ? Math.round(weightDelta7 * 100) / 100 : null,
  },
  energy: energyRow
    ? { level: energyRow.energy_level, date: energyRow.date }
    : null,
  vo2max: vo2Row
    ? { value: Math.round(vo2Row.vo2max * 10) / 10, date: vo2Row.date }
    : null,
  body_comp: bodyRow
    ? {
        fat_pct: Math.round(bodyRow.body_fat_percentage * 10) / 10,
        lean_kg: Math.round(bodyRow.lean_body_mass_kg * 10) / 10,
        date: bodyRow.date,
      }
    : null,
  workouts_7d: workoutRows.map((w) => ({
    type: w.activity_type,
    mins: Math.round(w.duration_minutes),
    km: w.distance_km ? Math.round(w.distance_km * 10) / 10 : null,
  })),
};

if (outputJson) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// Human-readable text
const lines: string[] = [];
lines.push(`## Health digest — ${today}`);
lines.push("");

if (data.hrv.avg7d !== null) {
  const trendStr = data.hrv.trend ? ` (${data.hrv.trend} vs prior week)` : "";
  lines.push(`**Recovery (HRV 7d avg):** ${data.hrv.avg7d}ms${trendStr}`);
}
if (data.rhr !== null) {
  lines.push(`**Resting HR:** ${data.rhr}bpm`);
}
if (data.steps.yesterday !== null) {
  const avg3Str = data.steps.avg3d
    ? `, 3d avg ${data.steps.avg3d.toLocaleString()}`
    : "";
  lines.push(
    `**Steps (yesterday):** ${data.steps.yesterday.toLocaleString()}${avg3Str}`,
  );
}
if (data.weight.latest !== null) {
  const deltaStr =
    data.weight.delta7d !== null
      ? ` (${data.weight.delta7d > 0 ? "+" : ""}${data.weight.delta7d}kg vs 7d ago)`
      : "";
  lines.push(
    `**Weight:** ${data.weight.latest}kg${deltaStr} (as of ${data.weight.date})`,
  );
}
if (data.energy) {
  const daysAgo = Math.round(
    (Date.now() - new Date(data.energy.date).getTime()) / 86400000,
  );
  const whenStr =
    daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
  lines.push(`**Energy (last logged):** ${data.energy.level}/5 (${whenStr})`);
}
if (data.vo2max) {
  lines.push(`**VO2Max:** ${data.vo2max.value} (${data.vo2max.date})`);
}
if (data.body_comp) {
  lines.push(
    `**Body comp:** ${data.body_comp.fat_pct}% fat, ${data.body_comp.lean_kg}kg lean (${data.body_comp.date})`,
  );
}
if (data.workouts_7d.length > 0) {
  const summary = data.workouts_7d
    .map((w) => `${w.type} ${w.mins}min${w.km ? ` ${w.km}km` : ""}`)
    .join(", ");
  lines.push(`**Workouts (7d):** ${summary}`);
}

const output = lines.join("\n");
console.log(output);

if (save) {
  const savePath = path.join(process.cwd(), "docs", "health-digest.md");
  writeFileSync(savePath, output + "\n");
  console.error(`Saved to ${savePath}`);
}
