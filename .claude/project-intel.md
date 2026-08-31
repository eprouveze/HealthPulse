---
status: parked
revenue_potential: none
last_meaningful_commit: "2026-01-17"
primary_stack:
  - Next.js 15
  - React 19
  - TypeScript 5.7
  - SQLite (better-sqlite3)
  - Drizzle ORM
  - Claude API (Opus 4.8)
  - Tailwind CSS
  - Recharts
  - Radix UI
capabilities:
  - Apple Health data import (XML parsing)
  - Weight, steps, workouts, sleep, HR, HRV, body composition tracking
  - GPS route visualization for workouts
  - AI-powered health coaching with complete historical context
  - Nutrition sprint tracking with AI calorie estimation
  - Interactive multi-axis charts (30D/90D/1Y/3Y/5Y/10Y views)
  - Activity-weight correlation analysis
  - Gamification system (XP, levels, streaks, badges, daily quests)
  - Trend analysis with milestones and historical comparisons
  - Recovery metrics interpretation (HRV/resting HR)
  - Calendar heatmaps (GitHub-style activity view)
last_refreshed: "2026-03-22"
---

# Project Intelligence -- HealthPulse

## Overview
Personal health dashboard for Mac that integrates Apple Health data with AI coaching, gamification, and activity analysis. Stores all data locally in SQLite; optional Claude API integration for AI Coach feature.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, shadcn/ui
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Charts**: Recharts for interactive visualization
- **AI**: Anthropic Claude API (Opus 4.8 for coaching)
- **Maps**: Leaflet for GPS route visualization
- **Dev**: TypeScript 5.7, Turbopack

## Capabilities
- **Data Import**: Apple Health XML export parser (weights, steps, workouts, sleep, resting HR, HRV, VO2Max, body composition, GPS routes)
- **Health Tracking**: Weight, daily steps, flights climbed, workouts (with distance), sleep, resting heart rate, HRV (SDNN), body fat %, VO2Max
- **AI Coach**: Claude-powered personal coach with full health history context; tracks activity-weight correlations; provides recovery guidance via HRV/resting HR; can analyze nutrition sprints
- **Nutrition Sprints**: Time-boxed food tracking with daily calorie/protein aggregation and AI estimation
- **Visualization**: Multi-axis charts with configurable date ranges; activity correlation heatmaps; yearly summaries; workout route replay
- **Gamification**: XP system (log weight: +10, hit step goal: +15, complete workout: +20), levels 1-50+, streak tracking, 14 badge types, daily quests
- **Analysis**: Milestone detection, trend analysis, historical comparisons, yearly stats aggregation

## Current State
- **Status**: Stable, personal-use quality
- **Port**: 4000 (Turbopack dev server)
- **Deployment**: Local only; no cloud deployment configured
- **Target Platform**: Mac desktop only
- **Data Storage**: SQLite database in project root (gitignored)
- **Last Update**: 2026-01-17

## Known Issues
- **Sleep data incomplete**: User doesn't wear Apple Watch during sleep, so recorded sleep is only occasional naps; system explicitly ignores sleep data in coaching
- **Nutrition sprints**: Requires manual food entry or AI calorie estimation
- **GPS routes**: Leaflet visualization may have performance implications with 100+ routes

## Architecture Notes
- **Database schema**: 12 main tables (weights, goals, entries, dailySteps, workouts, dailySleep, restingHeartRate, workoutRoutes, bodyComposition, vo2max, heartRateVariability, foodEntries, nutritionSprints)
- **API routes**: 19 endpoints covering data CRUD, analysis, coaching, nutrition, gamification
- **Coach context**: Sends full health history on each query (all weights, steps, workouts, HR, HRV, routes formatted compactly as pipe-separated values)
- **Local-first**: No cloud sync; all data stays on machine; API key (Anthropic) stored locally
- **Deduplication**: Import script handles multiple devices (iPhone + Apple Watch) automatically

## Development Notes
- **Built entirely via Claude Code**: No hand-written code; all 8,700+ lines generated
- **Import process**: `npm run import` auto-detects Apple Health export in `imports/` folder, creates backups before import
- **Watch mode**: `npm run watch` for auto-import on file changes
- **DB migrations**: Drizzle Kit (`db:generate`, `db:migrate`); schema at `src/lib/schema.ts`
- **Personal context**: Optional `.env.local` with `PERSONAL_MEDICAL_CONTEXT` for coach customization (gitignored)
