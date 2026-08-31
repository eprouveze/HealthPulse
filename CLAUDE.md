# CLAUDE.md

## Project Overview

Personal health dashboard — imports Apple Health data into SQLite, displays weight/activity/sleep trends, AI coaching via Claude API. **Mac desktop only.**

## Tech Stack

- Next.js 15 App Router + Turbopack (port 4000)
- SQLite via better-sqlite3 + Drizzle ORM
- Tailwind CSS + shadcn/ui + Recharts
- Anthropic Claude API for AI coaching

## Quick Commands

```bash
npm run dev              # Dev server (port 4000)
npm run build && npm run start
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Run pending migrations
npm run db:studio        # Drizzle Studio GUI
npm run import           # Import from imports/apple_health_export/export.xml
npm run watch            # Watch mode for auto-import
```

## Database Schema (src/lib/schema.ts)

- `weights` - Weight entries (date, kg, source)
- `goals` - Target weights
- `entries` - Daily check-ins (notes, energy, fasting)
- `daily_steps` - Steps per day + flights climbed
- `workouts` - Workout sessions (type, duration, distance, calories)
- `daily_sleep` - Sleep data (start, end, duration, in-bed)
- `resting_heart_rate` - Daily resting HR
- `body_composition` - Body fat %, lean body mass (MASARU scale)
- `vo2max` - VO2Max (mL/kg/min)
- `heart_rate_variability` - HRV SDNN (AI Coach only, not displayed)
- `nutrition_sprints` - Time-boxed food tracking periods
- `food_entries` - Food items with calories, protein
- `settings` - Key-value store (API key as `anthropic_api_key`)

## Apple Health Import

**In-App** (preferred): Import notification banner appears when new data detected.

**CLI**: Export from iPhone → Unzip → Copy `apple_health_export` folder to `imports/` → `npm run import`

- Also reads `imports/apple_health_export/workout-routes/*.gpx`
- Creates automatic backup before import
- Deduplicates across iPhone + Watch

**Data safety**: `settings`, `goals`, `entries` are never touched by import. `nutrition_sprints` and `food_entries` are user-created only.

## Nutrition Sprint Feature

Time-boxed food tracking (10/14/20 days) in Health tab. Uses Claude AI for calorie estimation from natural language descriptions. AI Coach receives nutrition context during active sprints.

## Danger zones

- The SQLite DB holds irreplaceable personal health history. Import auto-backs-up first;
  never run a raw destructive migration without a manual copy of the DB file.
- Import only writes measurement tables — `settings`, `goals`, `entries`, `nutrition_sprints`,
  `food_entries` are user-owned and must stay untouched by any import/sync code.

---

Last reviewed: 2026-07-09
