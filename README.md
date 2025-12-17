# Weight Tracker

A personal weight tracking dashboard for Mac that integrates with Apple Health data, featuring AI coaching, gamification, and activity correlation analysis.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![SQLite](https://img.shields.io/badge/SQLite-3-green)

## Features

- **Weight Tracking**: Import weight data from Apple Health or log manually
- **Activity Integration**: Steps and workout data (walking, cycling, etc.) from Apple Health
- **Progress Charts**: Interactive charts with multiple timespans and precision levels
- **AI Coach**: Personalized coaching powered by Claude (requires Anthropic API key)
- **Gamification**: XP, levels, streaks, badges, and daily quests
- **Trend Analysis**: Milestones, insights, and historical comparisons
- **Daily Check-ins**: Track energy levels, fasting hours, and notes

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Charts**: Recharts
- **Database**: SQLite with Drizzle ORM
- **AI**: Anthropic Claude API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (runs on port 4000)
npm run dev
```

### Import Apple Health Data

1. Export your Apple Health data from iPhone (Health app → Profile → Export All Health Data)
2. Extract the ZIP file
3. Run the import script:

```bash
npm run import /path/to/apple_health_export/export.xml
```

The import script:
- Creates automatic backups before importing
- Deduplicates data from multiple devices (iPhone + Apple Watch)
- Imports weights, daily steps, and workouts

### Database Commands

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio GUI
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (weights, stats, coach, etc.)
│   └── page.tsx       # Main dashboard
├── components/
│   ├── ui/            # shadcn/ui components
│   ├── weight-activity-chart.tsx
│   ├── gamification-panel.tsx
│   ├── activity-panel.tsx
│   └── lifestyle-tracker.tsx
└── lib/
    ├── schema.ts      # Drizzle database schema
    ├── db.ts          # Database connection
    ├── analysis.ts    # Trend analysis logic
    └── gamification.ts # XP and badge calculations

scripts/
├── import-apple-health.ts  # Apple Health XML parser
└── watch-import.ts         # Auto-import watcher
```

## AI Coach Setup

The AI Coach requires an Anthropic API key:

1. Get your API key from [console.anthropic.com](https://console.anthropic.com)
2. Click the Settings icon in the app
3. Enter your API key and click Save

## License

MIT
