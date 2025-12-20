# Implementation Plan: Health Metrics & Food Tracking

**Date**: 2025-12-20
**Scope**: 3 phases + periodic food tracking feature
**Strategy**: Parallel agents where possible, test after each phase

---

## Executive Summary

**Phase 1**: Body composition + workout calories (CRITICAL for bariatric context)
**Phase 2**: VO2Max + flights climbed (fitness context)
**Phase 3**: HRV for AI Coach (recovery insights)
**Bonus**: Periodic food tracking with AI calorie estimation

**Parallel Strategy**: Use 2-3 agents for non-conflicting file work to maximize efficiency.

---

## Phase 1: Body Composition + Workout Calories

### Priority: CRITICAL
**Why**: Transforms app from weight tracker to body composition tracker - essential for bariatric patients.

### Database Changes

```sql
-- Body composition table
CREATE TABLE IF NOT EXISTS body_composition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  body_fat_percentage REAL NOT NULL,  -- 0-100 scale (e.g., 32.6)
  lean_body_mass_kg REAL NOT NULL,
  bmi REAL,  -- Optional, can calculate from weight
  source TEXT DEFAULT 'masaru',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date);

-- Add calories to workouts table
ALTER TABLE workouts ADD COLUMN calories_kcal REAL;
```

### Import Script Changes (scripts/import-apple-health.ts)

**Add regexes** (around line 190):
```typescript
const bodyFatRegex = /type="HKQuantityTypeIdentifierBodyFatPercentage"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const leanMassRegex = /type="HKQuantityTypeIdentifierLeanBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const workoutCaloriesRegex = /type="HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*sum="([^"]+)"/;
```

**Add data structures**:
```typescript
const bodyCompByDate: Map<string, { fat: number; lean: number }> = new Map();
let currentWorkoutCalories: number | null = null;
```

**Parse body composition** (in the line handler):
```typescript
// Body fat percentage
if (line.includes("HKQuantityTypeIdentifierBodyFatPercentage")) {
  const match = line.match(bodyFatRegex);
  if (match) {
    const [, dateTimeStr, valueStr] = match;
    const date = dateTimeStr.split(" ")[0];
    const fatPct = parseFloat(valueStr) * 100; // Convert 0.326 → 32.6
    if (!bodyCompByDate.has(date)) {
      bodyCompByDate.set(date, { fat: fatPct, lean: 0 });
    } else {
      bodyCompByDate.get(date)!.fat = fatPct;
    }
  }
}

// Lean body mass
if (line.includes("HKQuantityTypeIdentifierLeanBodyMass")) {
  const match = line.match(leanMassRegex);
  if (match) {
    const [, dateTimeStr, valueStr] = match;
    const date = dateTimeStr.split(" ")[0];
    const leanKg = parseFloat(valueStr);
    if (!bodyCompByDate.has(date)) {
      bodyCompByDate.set(date, { fat: 0, lean: leanKg });
    } else {
      bodyCompByDate.get(date)!.lean = leanKg;
    }
  }
}

// Workout calories (in WorkoutStatistics)
if (currentWorkout && line.includes("WorkoutStatistics") && line.includes("ActiveEnergyBurned")) {
  const match = line.match(workoutCaloriesRegex);
  if (match) {
    currentWorkoutCalories = parseFloat(match[1]);
  }
}
```

**Update workout saving** (modify existing workout structure):
```typescript
currentWorkout = { date, type, duration, distance: null, calories: null };

// When saving workout
if (currentWorkout) {
  workouts.push({ ...currentWorkout, calories: currentWorkoutCalories });
  currentWorkoutCalories = null;
}
```

**Add insert statements**:
```typescript
const insertBodyComp = db.prepare(`
  INSERT OR REPLACE INTO body_composition (date, body_fat_percentage, lean_body_mass_kg, source, created_at)
  VALUES (?, ?, ?, 'masaru', datetime('now'))
`);
```

**Insert body composition in transaction**:
```typescript
// Inside insertAll transaction
for (const [date, comp] of bodyCompByDate) {
  if (comp.fat > 0 && comp.lean > 0) {
    insertBodyComp.run(date, comp.fat, comp.lean);
  }
}
```

### API Routes

**New routes**:
- `src/app/api/body-composition/route.ts` - GET body composition history
- Update `src/app/api/workouts/route.ts` - Include calories in response

**Body Composition API**:
```typescript
import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const db = new Database(path.join(process.cwd(), "weight-tracker.db"));

  const bodyComp = db.prepare(`
    SELECT date, body_fat_percentage, lean_body_mass_kg, bmi
    FROM body_composition
    ORDER BY date DESC
    LIMIT 90
  `).all();

  db.close();
  return NextResponse.json(bodyComp);
}
```

### Database Schema Update (src/lib/schema.ts)

```typescript
export const bodyComposition = sqliteTable("body_composition", {
  id: int("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  bodyFatPercentage: real("body_fat_percentage").notNull(),
  leanBodyMassKg: real("lean_body_mass_kg").notNull(),
  bmi: real("bmi"),
  source: text("source").default("masaru"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// Update workouts table
export const workouts = sqliteTable("workouts", {
  id: int("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  activityType: text("activity_type").notNull(),
  durationMinutes: real("duration_minutes").notNull(),
  distanceKm: real("distance_km"),
  caloriesKcal: real("calories_kcal"),  // NEW
  source: text("source").default("apple_health"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});
```

### UI Changes (src/app/page.tsx)

**Add stats cards** (in the Stats section):
```typescript
// Fetch body composition
const [latestBodyComp, setLatestBodyComp] = useState<{
  date: string;
  bodyFatPercentage: number;
  leanBodyMassKg: number;
  prevBodyFat?: number;
  prevLeanMass?: number;
} | null>(null);

useEffect(() => {
  fetch("/api/body-composition")
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        setLatestBodyComp({
          date: data[0].date,
          bodyFatPercentage: data[0].body_fat_percentage,
          leanBodyMassKg: data[0].lean_body_mass_kg,
          prevBodyFat: data[30]?.body_fat_percentage,
          prevLeanMass: data[30]?.lean_body_mass_kg,
        });
      }
    });
}, []);

// In the stats cards section, add:
{latestBodyComp && (
  <>
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">Body Fat</div>
        <div className="text-2xl font-bold">{latestBodyComp.bodyFatPercentage.toFixed(1)}%</div>
        {latestBodyComp.prevBodyFat && (
          <div className="text-xs text-muted-foreground">
            {(latestBodyComp.bodyFatPercentage - latestBodyComp.prevBodyFat).toFixed(1)}% (30d)
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">Lean Mass</div>
        <div className="text-2xl font-bold">{latestBodyComp.leanBodyMassKg.toFixed(1)} kg</div>
        {latestBodyComp.prevLeanMass && (
          <div className="text-xs text-muted-foreground">
            {(latestBodyComp.leanBodyMassKg - latestBodyComp.prevLeanMass > 0 ? '+' : '')}
            {(latestBodyComp.leanBodyMassKg - latestBodyComp.prevLeanMass).toFixed(1)} kg (30d)
          </div>
        )}
      </CardContent>
    </Card>
  </>
)}
```

**Update workout display** to show calories:
```typescript
// In the workouts list
<div className="text-sm">
  {workout.activityType} | {workout.durationMinutes} min
  {workout.distanceKm && ` | ${workout.distanceKm.toFixed(1)} km`}
  {workout.caloriesKcal && ` | ${Math.round(workout.caloriesKcal)} kcal`}
</div>
```

### Testing Checklist

- [ ] Run `npm run db:generate` to generate migration
- [ ] Run `npm run db:migrate` to apply migration
- [ ] Run `npm run import` to import body composition data
- [ ] Verify data in database: `npm run db:studio`
- [ ] Check API response: `curl http://localhost:4000/api/body-composition`
- [ ] Visual test: Body fat and lean mass cards appear
- [ ] Visual test: Workout calories appear in workout list
- [ ] Test: 30-day changes calculate correctly

---

## Phase 2: VO2Max + Flights Climbed

### Priority: Medium (fitness context)

### Database Changes

```sql
-- VO2Max table
CREATE TABLE IF NOT EXISTS vo2max (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  vo2max REAL NOT NULL,  -- mL/kg/min
  source TEXT DEFAULT 'apple_health',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vo2max_date ON vo2max(date);

-- Add flights to daily activity (rename daily_steps → daily_activity)
ALTER TABLE daily_steps ADD COLUMN flights_climbed INTEGER;
```

### Import Script Changes

**Add regexes**:
```typescript
const vo2maxRegex = /type="HKQuantityTypeIdentifierVO2Max"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const flightsRegex = /type="HKQuantityTypeIdentifierFlightsClimbed"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
```

**Parse data**:
```typescript
const vo2maxByDate: Map<string, number> = new Map();
const flightsByDate: Map<string, number> = new Map();

// VO2Max parsing
if (line.includes("HKQuantityTypeIdentifierVO2Max")) {
  const match = line.match(vo2maxRegex);
  if (match) {
    const [, dateTimeStr, valueStr] = match;
    const date = dateTimeStr.split(" ")[0];
    const vo2max = parseFloat(valueStr);
    vo2maxByDate.set(date, vo2max);
  }
}

// Flights climbed (aggregate by date)
if (line.includes("HKQuantityTypeIdentifierFlightsClimbed")) {
  const match = line.match(flightsRegex);
  if (match) {
    const [, dateTimeStr, valueStr] = match;
    const date = dateTimeStr.split(" ")[0];
    const flights = parseInt(valueStr, 10);
    flightsByDate.set(date, (flightsByDate.get(date) || 0) + flights);
  }
}
```

**Insert statements**:
```typescript
const insertVO2Max = db.prepare(`
  INSERT OR REPLACE INTO vo2max (date, vo2max, source, created_at)
  VALUES (?, ?, 'apple_health', datetime('now'))
`);

// Update daily_steps to include flights
const insertActivity = db.prepare(`
  INSERT OR REPLACE INTO daily_steps (date, step_count, flights_climbed, source, created_at)
  VALUES (?, ?, ?, 'apple_health', datetime('now'))
`);
```

### API Routes

**New**: `src/app/api/vo2max/route.ts`
**Update**: `src/app/api/steps/route.ts` to include flights

### UI Changes

**Add VO2Max card**:
```typescript
<Card>
  <CardContent className="pt-6">
    <div className="text-sm text-muted-foreground">VO2Max</div>
    <div className="text-2xl font-bold">{vo2max.toFixed(1)} <span className="text-sm text-muted-foreground">mL/kg/min</span></div>
    <div className="text-xs text-muted-foreground">
      {vo2max < 30 ? 'Below Average' : vo2max < 40 ? 'Average' : vo2max < 50 ? 'Good' : 'Excellent'}
    </div>
  </CardContent>
</Card>
```

**Add flights to activity stats**:
```typescript
<div className="text-sm">
  Steps: {steps.toLocaleString()} | Flights: {flights}
</div>
```

### Testing Checklist

- [ ] Run migrations
- [ ] Import data
- [ ] Verify in database studio
- [ ] Check API responses
- [ ] Visual test: VO2Max card appears with correct value
- [ ] Visual test: Flights appear in activity section
- [ ] Test: Trend indicators work

---

## Phase 3: HRV for AI Coach

### Priority: Low (AI enhancement only)

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS heart_rate_variability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  hrv_sdnn_ms REAL NOT NULL,  -- milliseconds
  source TEXT DEFAULT 'apple_health',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hrv_date ON heart_rate_variability(date);
```

### Import Script

**Regex**:
```typescript
const hrvRegex = /type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
```

**Parse**:
```typescript
const hrvByDate: Map<string, number[]> = new Map();

if (line.includes("HKQuantityTypeIdentifierHeartRateVariabilitySDNN")) {
  const match = line.match(hrvRegex);
  if (match) {
    const [, dateTimeStr, valueStr] = match;
    const date = dateTimeStr.split(" ")[0];
    const hrv = parseFloat(valueStr);
    if (!hrvByDate.has(date)) {
      hrvByDate.set(date, []);
    }
    hrvByDate.get(date)!.push(hrv);
  }
}

// Calculate daily average
for (const [date, values] of hrvByDate) {
  const avgHRV = values.reduce((a, b) => a + b, 0) / values.length;
  insertHRV.run(date, avgHRV);
}
```

### API Route

**New**: `src/app/api/hrv/route.ts` - Used only by AI Coach, not displayed to user

### AI Coach Enhancement

**Update AI Coach system prompt** to include HRV context:
```typescript
const systemPrompt = `...existing context...

HEALTH METRICS AVAILABLE:
- Body Composition: Body fat percentage and lean body mass (from MASARU scale)
- Heart Rate Variability (HRV): Daily average SDNN in milliseconds
  * High HRV (>50ms) = good recovery, low stress
  * Low HRV (<30ms) = fatigue, stress, possible overtraining
  * Declining trend = may need rest/recovery focus
- VO2Max: Cardiovascular fitness indicator
- Workout calories: Actual energy expenditure from Apple Watch

BARIATRIC CONTEXT:
The user had sleeve gastrectomy on November 1, 2018. Key considerations:
- Protein is critical (60-80g/day minimum) to preserve lean mass
- Body composition matters MORE than weight - focus on fat loss + muscle preservation
- Small frequent meals work better than large portions
- Monitor lean mass closely - losing muscle is a red flag

RECOVERY INSIGHTS (use HRV data):
- If HRV drops >10% from 7-day average: suggest rest day, easier workout, or better sleep
- If HRV is consistently high: user is recovered and can handle harder training
- Correlate HRV with sleep quality and workout intensity

BODY COMPOSITION INSIGHTS:
- Celebrate fat loss even when weight is stable (if lean mass is preserved/increased)
- Alert if lean mass is declining (need more protein or resistance training)
- Example: "Your weight is stable at 90kg, but you lost 2kg of fat and gained 2kg of muscle - excellent progress!"
`;
```

**Fetch HRV data in coach endpoint**:
```typescript
// In src/app/api/coach/route.ts
const hrvData = db.prepare(`
  SELECT date, hrv_sdnn_ms
  FROM heart_rate_variability
  ORDER BY date DESC
  LIMIT 30
`).all();

const hrvAvg = hrvData.reduce((sum, d) => sum + d.hrv_sdnn_ms, 0) / hrvData.length;
const recent7DayHRV = hrvData.slice(0, 7).reduce((sum, d) => sum + d.hrv_sdnn_ms, 0) / 7;
const hrvTrend = recent7DayHRV > hrvAvg ? 'improving' : 'declining';

context += `\n\nHRV Status:
- 7-day average: ${recent7DayHRV.toFixed(1)}ms
- 30-day average: ${hrvAvg.toFixed(1)}ms
- Trend: ${hrvTrend}
${hrvTrend === 'declining' ? '- Consider suggesting rest or recovery focus' : ''}
`;
```

### Testing Checklist

- [ ] Run migrations
- [ ] Import HRV data
- [ ] Verify ~11,000+ records imported
- [ ] Test API endpoint returns data
- [ ] Test AI Coach receives HRV context
- [ ] Test AI Coach mentions recovery when HRV is low
- [ ] Verify HRV is NOT displayed in UI (AI only)

---

## Periodic Food Tracking Feature

### Inspiration from 10-Day App

**What worked well**:
- Natural language food entry ("100g grilled chicken leg")
- AI calorie estimation when exact data unavailable
- Time-boxed "sprint" approach (10-20 days)
- Daily AI coaching based on intake
- Support for Japanese food names

**Data structure** from 10-day app:
```json
{
  "foods": [
    {
      "id": "unique-id",
      "date": "2025-09-16",
      "time": "17:23",
      "item": "milk protein 200ml 20g protein",
      "calories": 107
    }
  ]
}
```

### Feature Design

**Core concept**: Optional periodic "nutrition sprints" where user commits to 10-20 days of food tracking.

**User flow**:
1. User clicks "Start Nutrition Sprint" button
2. Chooses duration (10, 14, or 20 days)
3. App creates a sprint with start/end dates
4. During sprint:
   - Quick food entry form appears at top of dashboard
   - User types food description
   - Option 1: User knows calories → enter manually
   - Option 2: User doesn't know → AI estimates calories
   - Food entries appear in daily timeline
   - Daily calorie total shown
   - AI Coach receives nutrition context
5. After sprint ends:
   - Summary report generated
   - Option to start new sprint or end tracking

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS nutrition_sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  item TEXT NOT NULL,
  calories REAL NOT NULL,
  protein_g REAL,  -- Optional
  ai_estimated INTEGER DEFAULT 0,  -- 1 if AI estimated, 0 if manual
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sprint_id) REFERENCES nutrition_sprints(id)
);

CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);
CREATE INDEX IF NOT EXISTS idx_food_entries_sprint ON food_entries(sprint_id);
```

### AI Calorie Estimation

**Use Claude API** (same as AI Coach):

```typescript
// src/app/api/estimate-calories/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { foodItem } = await req.json();

  // Get API key from settings
  const db = new Database(path.join(process.cwd(), "weight-tracker.db"));
  const apiKey = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get()?.value;
  db.close();

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `Estimate the calories and protein for this food item. Respond ONLY with a JSON object in this format:
{
  "calories": <number>,
  "protein_g": <number>,
  "confidence": "high|medium|low",
  "reasoning": "<brief explanation>"
}

Food item: ${foodItem}

Important:
- Be realistic and use standard portion sizes unless specified
- For Japanese foods, use typical Japanese portions
- Round to nearest whole number
- If the portion is unclear, assume a standard single serving`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: prompt
    }]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const estimate = JSON.parse(text);

  return NextResponse.json(estimate);
}
```

### UI Components

**Sprint Manager** (new component: `src/components/nutrition-sprint.tsx`):
```typescript
export function NutritionSprint() {
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [foodItem, setFoodItem] = useState("");
  const [calories, setCalories] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Start sprint
  const startSprint = async (days: number) => {
    await fetch("/api/nutrition-sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration_days: days })
    });
    // Reload active sprint
  };

  // Estimate calories with AI
  const estimateCalories = async () => {
    setIsEstimating(true);
    const res = await fetch("/api/estimate-calories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodItem })
    });
    const data = await res.json();
    setCalories(data.calories);
    setIsEstimating(false);
  };

  // Save food entry
  const saveFood = async () => {
    await fetch("/api/food-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprint_id: activeSprint.id,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        item: foodItem,
        calories,
        ai_estimated: calories !== null && isEstimating
      })
    });
    // Clear form, reload entries
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        {!activeSprint ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Start a nutrition sprint to track your food intake for 10-20 days.
              Get AI-powered calorie estimates and personalized insights.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => startSprint(10)}>10 Days</Button>
              <Button onClick={() => startSprint(14)}>14 Days</Button>
              <Button onClick={() => startSprint(20)}>20 Days</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-muted-foreground mb-4">
              Sprint Day {activeSprint.currentDay} of {activeSprint.duration_days}
            </div>

            <div className="flex flex-col gap-2">
              <Input
                placeholder="Enter food (e.g., '100g grilled chicken')"
                value={foodItem}
                onChange={(e) => setFoodItem(e.target.value)}
              />

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Calories"
                  value={calories || ""}
                  onChange={(e) => setCalories(parseFloat(e.target.value))}
                />
                <Button
                  onClick={estimateCalories}
                  disabled={!foodItem || isEstimating}
                  variant="outline"
                >
                  {isEstimating ? "Estimating..." : "AI Estimate"}
                </Button>
              </div>

              <Button onClick={saveFood} disabled={!calories}>
                Add Food
              </Button>
            </div>

            {/* Today's entries */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Today's Intake</h4>
              {todaysFoods.map(food => (
                <div key={food.id} className="text-sm py-1 border-b">
                  <span className="font-medium">{food.item}</span>
                  <span className="text-muted-foreground ml-2">{food.calories} kcal</span>
                  {food.ai_estimated === 1 && <span className="ml-2 text-xs text-blue-500">AI</span>}
                </div>
              ))}
              <div className="font-bold mt-2">
                Total: {totalCaloriesToday} kcal
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### AI Coach Integration

When nutrition sprint is active, include food data in AI Coach context:

```typescript
// In src/app/api/coach/route.ts
const activeSprint = db.prepare(`
  SELECT * FROM nutrition_sprints WHERE is_active = 1
`).get();

if (activeSprint) {
  const recentFoods = db.prepare(`
    SELECT date, item, calories, protein_g
    FROM food_entries
    WHERE sprint_id = ?
    ORDER BY date DESC, time DESC
    LIMIT 50
  `).all(activeSprint.id);

  const dailyTotals = {};
  for (const food of recentFoods) {
    if (!dailyTotals[food.date]) {
      dailyTotals[food.date] = { calories: 0, protein: 0, items: [] };
    }
    dailyTotals[food.date].calories += food.calories;
    if (food.protein_g) dailyTotals[food.date].protein += food.protein_g;
    dailyTotals[food.date].items.push(food.item);
  }

  context += `\n\nNUTRITION SPRINT ACTIVE (Day ${activeSprint.currentDay}/${activeSprint.duration_days}):
${Object.entries(dailyTotals).slice(0, 7).map(([date, data]) =>
  `${date}: ${data.calories} kcal, ${data.protein}g protein\n  Foods: ${data.items.join(', ')}`
).join('\n')}

Use this data to:
- Assess if calorie intake aligns with activity level and weight goals
- Check if protein intake meets bariatric minimum (60-80g/day)
- Identify patterns (late eating, low protein days, high calorie days)
- Provide specific feedback on food choices for bariatric context
`;
}
```

### Testing Checklist

- [ ] Database tables created
- [ ] Can start nutrition sprint
- [ ] Food entry form appears
- [ ] Manual calorie entry works
- [ ] AI calorie estimation works
- [ ] Food entries save correctly
- [ ] Daily totals calculate correctly
- [ ] AI Coach receives nutrition context
- [ ] Sprint can be ended
- [ ] Summary report generates

---

## Parallel Agent Strategy

To maximize efficiency and avoid file conflicts, we'll use parallel agents for non-overlapping work:

### Agent 1: Database & Import Script
**Files**:
- `scripts/import-apple-health.ts`
- `src/lib/schema.ts`
- Database migrations

**Tasks**:
- Create database tables (all 3 phases)
- Add import logic for all metrics
- Test import end-to-end

### Agent 2: API Routes
**Files**:
- `src/app/api/body-composition/route.ts`
- `src/app/api/vo2max/route.ts`
- `src/app/api/hrv/route.ts`
- `src/app/api/nutrition-sprints/route.ts`
- `src/app/api/food-entries/route.ts`
- `src/app/api/estimate-calories/route.ts`
- Update `src/app/api/workouts/route.ts`

**Tasks**:
- Create all new API endpoints
- Update existing endpoints
- Test API responses

### Agent 3: UI Components & AI Coach
**Files**:
- `src/app/page.tsx` (main dashboard)
- `src/components/nutrition-sprint.tsx` (new)
- `src/app/api/coach/route.ts` (AI Coach enhancement)

**Tasks**:
- Add stat cards for body composition, VO2Max
- Update workout display with calories
- Add flights to activity section
- Create nutrition sprint component
- Enhance AI Coach system prompt and context

### Execution Plan

**Phase 1** (Body Composition + Workout Calories):
1. Launch Agent 1 & Agent 2 in parallel
2. Wait for both to complete
3. Launch Agent 3
4. Test end-to-end

**Phase 2** (VO2Max + Flights):
1. Launch Agent 1 & Agent 2 in parallel
2. Wait for both to complete
3. Launch Agent 3
4. Test end-to-end

**Phase 3** (HRV + Nutrition Feature):
1. Launch Agent 1 & Agent 2 in parallel
2. Wait for both to complete
3. Launch Agent 3 (AI Coach enhancement + nutrition UI)
4. Test end-to-end

---

## AI Coach Enhancement Summary

With all metrics available, the AI Coach will have comprehensive context:

**Physical Metrics**:
- Weight trend
- Body composition (fat % + lean mass)
- Workout frequency, duration, distance, calories
- Daily steps + flights climbed
- VO2Max (cardiovascular fitness)
- Resting heart rate
- Sleep duration and quality

**Recovery Metrics**:
- Heart rate variability (HRV)
- Sleep patterns

**Nutrition** (during sprints):
- Daily calorie intake
- Protein intake
- Meal timing
- Food choices

**Enhanced Coaching Capabilities**:
1. **Body Recomposition Insights**: "Your weight is stable, but you lost 2kg of fat and gained 1.5kg of muscle - excellent progress!"
2. **Recovery Guidance**: "Your HRV has dropped 15% this week - consider a rest day or easier workout"
3. **Protein Optimization**: "You're only getting 45g protein/day - for bariatric patients, aim for 60-80g to preserve your lean mass of 62kg"
4. **Calorie Calibration**: "You're burning 500-600 kcal per day in workouts but only eating 1,600 kcal - great deficit, but watch for energy drops"
5. **Cardiovascular Progress**: "Your VO2Max improved from 36 to 38 over 3 months - your heart health is improving even though weight is stable"
6. **Activity Balance**: "You're getting 12,000 steps on flat ground but only 3 flights of stairs - try adding some hill walks or stair climbing"

---

## Testing Strategy

After each phase:

1. **Import Test**: Run `npm run import` and verify data in Drizzle Studio
2. **API Test**: Use curl or browser to test each endpoint
3. **UI Test**: Visual inspection of all new components
4. **Integration Test**: Complete user flow from data import → UI display → AI Coach response
5. **Edge Cases**: Test with missing data, empty states, error conditions

**Success Criteria**:
- All data imports without errors
- APIs return correct data
- UI displays all metrics accurately
- AI Coach receives and uses new context
- No regressions in existing features

---

## Rollback Plan

Each phase is independent:
- Phase 1 can work without Phase 2/3
- Phase 2 can work without Phase 3
- Nutrition feature is entirely optional

If issues arise:
1. Revert database migration: restore from backup
2. Revert code: git reset to previous commit
3. Re-import data from Apple Health export

---

## Timeline Estimate

**Phase 1**: 3-4 hours
**Phase 2**: 2-3 hours
**Phase 3**: 2-3 hours
**Nutrition Feature**: 3-4 hours

**Total**: 10-14 hours of development + testing

With parallel agents: ~6-8 hours elapsed time

---

## Next Steps

1. Review this plan with user
2. Get approval on display choices and feature priorities
3. Begin Phase 1 implementation with parallel agents
4. Test thoroughly after each phase
5. Document changes in CLAUDE.md
6. Commit and push after each successful phase

