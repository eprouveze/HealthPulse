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
npm run import                                    # Import from imports/export.xml
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
- `daily_steps` - Aggregated step counts per day
- `workouts` - Individual workout sessions (type, duration, distance)

### Key API Routes
| Route | Purpose |
|-------|---------|
| `/api/weights` | CRUD for weight entries |
| `/api/stats` | Calculated statistics |
| `/api/analysis` | Trends, milestones, insights |
| `/api/game` | Gamification state (XP, level, badges) |
| `/api/coach` | AI coaching via Claude API |
| `/api/steps`, `/api/workouts`, `/api/activity-stats` | Activity data |

### Main Dashboard (src/app/page.tsx)
Single-page dashboard with sections: Stats cards → Progress chart → Activity panel → Insights → AI Coach → Gamification → Daily check-in → Trends → Recent entries

### Apple Health Import
**Workflow**: Export from iPhone Health app → Unzip → Copy `export.xml` to `imports/` folder → Run `npm run import`

The import script (`scripts/import-apple-health.ts`):
- Default import path: `imports/export.xml` (in project root)
- Creates automatic backup before import (in `backups/`)
- Deduplicates data from multiple devices (iPhone + Watch)
- Uses max single-source step count per day to avoid double-counting
- Supports weights, steps, and workouts (walking, cycling, etc.)

### Chart Component (src/components/weight-activity-chart.tsx)
Dual-axis ComposedChart showing:
- Weight trend (left Y-axis)
- Steps as bars + Walking km as bars (right Y-axis)
- Time controls: 30D/90D/1Y/3Y/5Y/10Y/All
- Precision controls: Day/Week/Month/Year
- Preferences persisted to localStorage

## User Medical Context
**Sleeve Gastrectomy**: The user had bariatric surgery on **November 1, 2018**.
- Pre-surgery peak: ~114kg (July 2018)
- Post-surgery low: ~86kg (mid-2019)
- Surgery removed ~80% of stomach capacity
- This context is included in AI Coach system prompt for personalized advice
- Post-bariatric considerations: protein-first eating, small frequent meals, vitamin absorption

## Activity-Weight Correlation Algorithm
Located in `src/app/api/activity-stats/route.ts`:
- Uses **1 year** of data for meaningful correlations (not short-term)
- Groups by **month** (not week) to reduce noise from water retention, etc.
- Compares high activity months (>115% of average) vs low activity months (<85%)
- Tracks weight trend direction within each month (up/down/flat)
- Long-term analysis compares step counts during lowest vs highest weight periods

## Git Workflow
When asked to "document, commit and push" - follow that exact order:
1. **Document** - Update CLAUDE.md or relevant docs with changes made
2. **Commit** - Stage and commit code + documentation together
3. **Push** - Push once with everything included

Never push before documenting. Keep changes atomic in a single commit when possible.

## Platform
**Mac desktop only** - Not a mobile app. Optimize for keyboard shortcuts, data density, and wide screen layouts.
