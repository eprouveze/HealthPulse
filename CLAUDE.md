# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs on port 4000)
npm run dev

# Build & Production
npm run build
npm run start

# Linting
npm run lint

# Database
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio GUI

# Apple Health Import
npm run import                                    # Import from imports/apple_health_export/export.xml
npx tsx scripts/import-apple-health.ts /path/to/export.xml  # Custom path
npm run watch                                     # Watch mode for auto-import
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router, Turbopack
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components + Recharts
- **AI**: Anthropic Claude API (Sonnet 4.5) for coaching

### Data Flow
```
Apple Health XML → scripts/import-apple-health.ts → SQLite (weight-tracker.db)
                                                          ↓
                                                    Drizzle ORM
                                                          ↓
                                              API Routes (src/app/api/)
                                                          ↓
                                              React Components (page.tsx)
```

### Database Schema (src/lib/schema.ts)
- `weights` - Weight entries (date, kg, source)
- `goals` - Target weights
- `entries` - Daily check-ins (notes, energy, fasting)
- `daily_steps` - Aggregated step counts per day + flights climbed
- `workouts` - Individual workout sessions (type, duration, distance, calories)
- `daily_sleep` - Sleep data (start, end, duration, in-bed time)
- `resting_heart_rate` - Daily resting HR (bpm)
- `workout_routes` - GPS routes (JSON array of lat/lon points)
- `body_composition` - Body fat %, lean body mass (from MASARU scale)
- `vo2max` - VO2Max cardiovascular fitness (mL/kg/min)
- `heart_rate_variability` - HRV SDNN for AI Coach recovery analysis (not displayed)
- `nutrition_sprints` - Time-boxed food tracking periods (10/14/20 days)
- `food_entries` - Individual food items with calories, protein, timestamp
- `settings` - Key-value store (API key stored as `anthropic_api_key`)

### Key API Routes
| Route | Purpose |
|-------|---------|
| `/api/weights` | CRUD for weight entries |
| `/api/stats` | Calculated statistics |
| `/api/analysis` | Trends, milestones, insights |
| `/api/game` | Gamification state (XP, level, badges) |
| `/api/coach` | AI coaching via Claude API |
| `/api/steps`, `/api/workouts`, `/api/activity-stats` | Activity data (steps, flights, calories) |
| `/api/sleep`, `/api/resting-hr`, `/api/workout-routes` | Health metrics |
| `/api/body-composition` | Body fat % and lean body mass |
| `/api/vo2max` | VO2Max cardiovascular fitness |
| `/api/hrv` | HRV stats for AI Coach (internal use) |
| `/api/nutrition-sprints` | CRUD for nutrition tracking periods |
| `/api/food-entries` | CRUD for food items with calories/protein |
| `/api/estimate-calories` | AI-powered calorie estimation |
| `/api/settings` | Key-value settings (API key) |
| `/api/import/check` | Check for new Apple Health data |
| `/api/import/run` | Trigger import from UI |

### Main Dashboard (src/app/page.tsx)
Single-page dashboard with sections: Stats cards → Progress chart → Activity panel → Insights → AI Coach → Gamification → Daily check-in → Trends → Recent entries

### Apple Health Import
**In-App Import** (preferred): When new health data is detected, an import notification banner appears at the top of the dashboard. Click "Import Now" to run the import directly from the UI. The check also auto-extracts `export.zip` if found in the imports directory.

**CLI Workflow**: Export from iPhone Health app → Unzip → Copy entire `apple_health_export` folder to `imports/` → Run `npm run import`

The import script (`scripts/import-apple-health.ts`):
- Default path: `imports/apple_health_export/export.xml`
- Also reads: `imports/apple_health_export/workout-routes/*.gpx`
- Creates automatic backup before import (in `backups/`)
- Deduplicates data from multiple devices (iPhone + Watch)
- Imports: weights, steps, workouts (with calories), sleep, resting HR, GPS routes, body composition, VO2Max, flights climbed, HRV

**Import data safety:**
- ✅ Safe (never touched): `settings`, `goals`, `entries`
- ⚠️ Upserted by date: `weights`, `daily_steps`, `daily_sleep`, `resting_heart_rate`, `body_composition`, `vo2max`, `heart_rate_variability`
- ✅ Insert-only: `workouts`, `workout_routes` (duplicates ignored)

### Chart Component (src/components/weight-activity-chart.tsx)
Dual-axis ComposedChart showing:
- Weight trend (left Y-axis, auto-scales to data range for better trend visibility)
- Steps as bars + Walking km as bars (right Y-axis)
- Time controls: 30D/90D/1Y/3Y/5Y/10Y/All
- Precision controls: Day/Week/Month/Year
- Preferences persisted to localStorage

## Activity-Weight Correlation Algorithm
Located in `src/app/api/activity-stats/route.ts`:
- Uses **1 year** of data for meaningful correlations (not short-term)
- Groups by **month** (not week) to reduce noise from water retention, etc.
- Compares high activity months (>115% of average) vs low activity months (<85%)
- Tracks weight trend direction within each month (up/down/flat)
- Long-term analysis compares step counts during lowest vs highest weight periods

## Nutrition Sprint Feature
**Location**: Health tab → Nutrition Sprint panel (`src/components/nutrition-sprint.tsx`)

Time-boxed food tracking inspired by the "10-day app" approach:
- Start a sprint (10, 14, or 20 days) to track food intake
- Enter food items with manual calories or AI estimation
- Track daily calories and protein totals
- AI Coach receives nutrition context during active sprints

**Components**:
- `NutritionSprintPanel` - UI component in Health tab
- `/api/nutrition-sprints` - Sprint lifecycle management
- `/api/food-entries` - Food item CRUD
- `/api/estimate-calories` - Claude AI calorie estimation

**AI Calorie Estimation**:
- Uses Claude Sonnet 4.5 via Anthropic API
- Returns calories, protein, confidence level, and reasoning
- Supports natural language ("100g grilled chicken", "protein shake")

**Data safety**: `nutrition_sprints` and `food_entries` are user-created data (never touched by Apple Health import)

## Git Workflow
When asked to "document, commit and push" - follow that exact order:
1. **Document** - Update CLAUDE.md or relevant docs with changes made
2. **Commit** - Stage and commit code + documentation together
3. **Push** - Push once with everything included

Never push before documenting. Keep changes atomic in a single commit when possible.

## Platform
**Mac desktop only** - Not a mobile app. Optimize for keyboard shortcuts, data density, and wide screen layouts.

## Playwright MCP
When using Playwright MCP for screenshots, PDFs, or any file output:
- **Always** save to the `Playwright/` folder in the project root
- **Never** save to the default Downloads folder
- Use `downloadsDir` parameter: `{PROJECT_ROOT}/Playwright/`
