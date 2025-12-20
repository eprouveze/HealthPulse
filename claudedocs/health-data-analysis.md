# Apple Health Data Analysis & Recommendations

**Date**: 2025-12-20
**Context**: Bariatric patient (Sleeve Gastrectomy Nov 2018)
**Current Tracking**: Weight, steps, workouts (duration/distance), sleep, resting HR, GPS routes

---

## Executive Summary

Analysis of Apple Health export reveals **significant high-value data** currently unused. Priority recommendations:

1. **Body Composition** (Fat % + Lean Mass) - **CRITICAL** for bariatric context
2. **VO2Max** - Cardiovascular fitness beyond weight
3. **Workout Calories** - Accurate energy expenditure
4. **Heart Rate Variability** - For AI Coach analysis (not display)

---

## Available Data Summary

| Metric | Records | Date Range | Data Quality | Recommendation |
|--------|---------|------------|--------------|----------------|
| **Body Fat %** | 1,433 | Nov 2019 - Dec 2025 | Excellent (MASARU scale) | **✅ IMPLEMENT** |
| **Lean Body Mass** | 1,433 | Nov 2019 - Dec 2025 | Excellent (MASARU scale) | **✅ IMPLEMENT** |
| **Workout Calories** | 1,578 | 2014 - 2025 | Good (Apple Watch) | **✅ IMPLEMENT** |
| **VO2Max** | 916 | Mar 2021 - Dec 2025 | Good (calculated) | **✅ IMPLEMENT** |
| **HRV (SDNN)** | 11,425 | Multiple years | Excellent | **🔶 AI ONLY** |
| **Walking Steadiness** | 433 | Recent | Good | **🔶 CONSIDER** |
| **Flights Climbed** | 25,079 | Multiple years | Excellent | **🔶 CONSIDER** |
| **Walking Speed** | 88,329 | Multiple years | Excellent | **🔶 CONSIDER** |
| **Heart Rate Recovery** | 567 | Multiple years | Good | **🔶 CONSIDER** |
| **Dietary Protein** | 7 | Sporadic | Useless | **❌ SKIP** |

---

## Priority 1: Body Composition (CRITICAL)

### Why It Matters for Bariatric Patients

**Post-bariatric weight loss isn't just about total weight** - it's about **fat loss vs muscle preservation**.

- **Common Issue**: Patients can lose significant muscle mass post-surgery
- **Hidden Problem**: Same weight, but worse body composition (more fat, less muscle)
- **True Success**: Losing fat while maintaining/building lean mass
- **Medical Relevance**: Lean mass correlates with metabolic health, strength, bone density

### What MASARU Provides

- **Body Fat Percentage** (0-100%, stored as decimal: 0.326 = 32.6%)
- **Lean Body Mass** (kg, absolute muscle/bone/organs weight)
- **BMI** (calculated, less useful since we have fat %)

### Data Quality: Excellent

1,433 measurements from Nov 2019 to present = ~6 years of consistent tracking

### Implementation Impact

**Display Benefits:**
- Track fat loss separately from weight loss
- Show muscle preservation during weight plateaus
- Visualize body recomposition (weight stable, but fat ↓ muscle ↑)

**AI Coach Benefits:**
- Personalized protein recommendations based on lean mass
- Detect unhealthy muscle loss patterns
- Celebrate fat loss even when scale doesn't move
- Adjust exercise recommendations (more strength training if losing muscle)

### Recommended Implementation

#### Database Schema
```sql
CREATE TABLE body_composition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  body_fat_percentage REAL NOT NULL,  -- 0-100 scale (e.g., 32.6)
  lean_body_mass_kg REAL NOT NULL,
  bmi REAL,  -- Optional, we can calculate it
  source TEXT DEFAULT 'masaru',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Display Options

**Option A: Separate Body Comp Tab**
- Dedicated section showing fat vs lean mass trends
- Stacked area chart: Fat mass (top) + Lean mass (bottom) = Total weight
- Shows composition changes over time

**Option B: Enhanced Weight Chart**
- Add secondary lines for fat mass and lean mass
- Toggle to show/hide composition breakdown
- More integrated view

**Option C: Stats Cards** (Simplest)
- Add cards: "Body Fat: 28.5%" and "Lean Mass: 62.3kg"
- Show 30-day change: "Fat: -1.2% | Muscle: +0.5kg"

**Recommendation**: Start with **Option C** (stats cards), then add **Option B** (chart toggle) later.

---

## Priority 2: VO2Max

### What It Is

**VO2Max** = Maximum oxygen uptake during intense exercise = Cardiovascular fitness level

- Measured in mL/kg/min (milliliters of oxygen per kg body weight per minute)
- Apple Watch estimates this from heart rate during outdoor walks/runs
- Ranges: 20-30 (poor), 30-40 (average), 40-50 (good), 50+ (excellent)

### Why It Matters

- **True Health Indicator**: Better predictor of longevity than weight
- **Fitness Beyond Weight**: Can improve VO2Max even without weight loss
- **Motivation**: Shows you're getting healthier even during plateaus
- **Medical Relevance**: Strong inverse correlation with cardiovascular disease risk

### Data Quality: Good

916 measurements from March 2021 to present = ~4.5 years

### Recommended Implementation

#### Database Schema
```sql
CREATE TABLE vo2max (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  vo2max REAL NOT NULL,  -- mL/kg/min
  source TEXT DEFAULT 'apple_health',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Display
- **Stats Card**: "VO2Max: 38.2 mL/kg/min (Average)" with trend indicator
- **Chart Option**: Small sparkline showing trend over time
- **AI Coach**: Use for fitness assessments and cardiovascular health insights

---

## Priority 3: Workout Calories

### The Question: Redundant or Valuable?

**We already have**: Duration (minutes) + Distance (km)
**Calories adds**: Actual energy expenditure based on heart rate

### Why It's NOT Redundant

1. **Different activities, different intensity**
   - 30 min walk at easy pace: ~150 kcal
   - 30 min walk at vigorous pace: ~300 kcal
   - Duration alone doesn't capture this

2. **Individual variation**
   - Heavier person burns more calories for same activity
   - Fitter person may burn fewer calories (more efficient)
   - Apple Watch uses HR + personal data for accuracy

3. **Strength training**
   - No distance metric
   - Calories is the ONLY measure of work done

### Data Quality: Excellent

1,578 workout sessions with calorie data = nearly all workouts tracked

### Recommended Implementation

#### Database Schema
```sql
ALTER TABLE workouts ADD COLUMN calories_kcal REAL;
```

#### Display
- **Workout list**: Add calories column: "Walking | 45 min | 3.2 km | 312 kcal"
- **Activity stats**: Total calories burned this week/month
- **Chart option**: Calories burned over time (bar chart)

#### AI Coach Usage
- Weekly energy expenditure trends
- Calorie burn patterns vs weight loss correlation
- Exercise efficiency insights

---

## Priority 4: Heart Rate Variability (HRV)

### What It Is

**HRV (SDNN)** = Variation in time between heartbeats = Autonomic nervous system health

- High HRV = Good recovery, low stress, healthy
- Low HRV = Fatigue, stress, overtraining
- Measured in milliseconds

### Why It Matters

- **Recovery indicator**: Shows when body needs rest vs ready to push
- **Stress monitor**: Detects chronic stress patterns
- **Sleep quality**: Correlates with recovery during sleep
- **Overtraining detection**: Warns before burnout

### Data Quality: Excellent

11,425 measurements = daily or more frequent tracking over years

### Recommended Implementation

#### Database Schema
```sql
CREATE TABLE heart_rate_variability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  hrv_sdnn_ms REAL NOT NULL,  -- milliseconds
  source TEXT DEFAULT 'apple_health',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Display Strategy: **AI Coach Only, Not User Display**

**Reasoning**: HRV is complex and easy to misinterpret. Use it behind the scenes.

**AI Coach Usage**:
- "Your HRV has been low this week - consider prioritizing recovery"
- "Great recovery metrics - your body is adapting well to training"
- Correlate HRV drops with sleep quality, stress, overtraining
- Suggest rest days when HRV indicates fatigue

**Don't Display Because**:
- Confusing metric for general users
- Daily fluctuations can be alarming without context
- Better as input to AI insights than raw data

---

## Secondary Metrics to Consider

### Flights Climbed

**Data**: 25,079 records (excellent coverage)

**Value**:
- Different activity dimension than steps
- Shows vertical/stair activity
- Easy to understand metric

**Implementation**:
- Add to activity stats: "Steps: 8,432 | Flights: 12"
- Could add to charts as optional overlay
- Low effort, moderate value

### Walking Steadiness

**Data**: 433 records (good coverage)

**Value**:
- Fall risk indicator (important for older adults)
- Functional fitness measure
- Unique metric not captured elsewhere

**Concern**: User is relatively young post-bariatric patient, may not be priority now

**Recommendation**: **Skip for now**, revisit in future as health metric matures

### Walking Speed & Heart Rate Recovery

**Data**: Excellent volume

**Value**: Both are fitness quality indicators

**Concern**: May add complexity without clear user value yet

**Recommendation**: **Consider for Phase 2** after core body composition is implemented

---

## Nutrition Data: The Missing Piece

### What's Available: Almost Nothing

- **Dietary Protein**: 7 records total (useless)
- **Dietary Carbs/Fat**: Similarly sparse
- **Calorie Intake**: Not consistently tracked

### Why This Matters for Bariatric Patients

**Protein is CRITICAL post-bariatric surgery**:
- Minimum 60-80g/day to prevent muscle loss
- Harder to consume with reduced stomach capacity
- Most common nutritional deficiency
- Direct impact on lean mass preservation

### The Problem

Apple Health relies on **manual logging** - users rarely maintain it long-term.

### Recommendation

**Can't fix with current data** - consider future feature:
- Manual protein goal tracking (simpler than full nutrition)
- Just one number: "Protein today: 75g / 80g"
- Focus on the ONE critical macro for bariatric patients

---

## Implementation Priority Ranking

### Phase 1: Core Body Composition (High Impact, Medium Effort)

1. **Body Composition** (Fat % + Lean Mass)
   - Database: Add `body_composition` table
   - Import: Parse `HKQuantityTypeIdentifierBodyFatPercentage` + `LeanBodyMass`
   - Display: Stats cards with 30-day trends
   - AI Coach: Enhanced insights about muscle preservation

2. **Workout Calories**
   - Database: Add `calories_kcal` to `workouts` table
   - Import: Parse `WorkoutStatistics` → `ActiveEnergyBurned`
   - Display: Add to workout list and stats
   - AI Coach: Energy expenditure analysis

**Estimated Effort**: 4-6 hours
**Impact**: High - transforms app from weight tracker to comprehensive body comp tool

### Phase 2: Fitness Metrics (Medium Impact, Low Effort)

3. **VO2Max**
   - Database: Add `vo2max` table
   - Import: Parse `HKQuantityTypeIdentifierVO2Max`
   - Display: Stats card + sparkline
   - AI Coach: Cardiovascular fitness insights

4. **Flights Climbed**
   - Database: Add `flights_climbed` to `daily_steps` (rename to `daily_activity`?)
   - Import: Parse `HKQuantityTypeIdentifierFlightsClimbed`
   - Display: Add to activity stats
   - AI Coach: Vertical activity context

**Estimated Effort**: 2-3 hours
**Impact**: Medium - adds fitness context beyond weight

### Phase 3: Advanced Analytics (Low Impact, Medium Effort)

5. **Heart Rate Variability**
   - Database: Add `heart_rate_variability` table
   - Import: Parse `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`
   - Display: None (AI only)
   - AI Coach: Recovery and stress insights

**Estimated Effort**: 2-3 hours
**Impact**: Low user-facing, high AI capability

---

## Recommended Immediate Next Steps

1. **Implement Body Composition + Workout Calories** (Phase 1)
   - These two additions transform the app's value proposition
   - Addresses the core question: "Am I losing fat or muscle?"
   - Workout calories complete the activity picture

2. **Update AI Coach Context** with new metrics
   - Add body composition awareness to system prompt
   - Reference lean mass for protein recommendations
   - Celebrate fat loss during weight plateaus

3. **Design Body Composition Display**
   - Keep it simple: two stat cards initially
   - Consider chart enhancement later
   - Make it easy to understand (avoid technical jargon)

4. **Phase 2 can wait** until Phase 1 proves valuable
   - VO2Max and Flights are nice-to-have
   - HRV is valuable but not urgent
   - Get user feedback on body comp first

---

## Technical Implementation Notes

### Import Script Changes Required

**Current pattern** (lines 186-191):
```typescript
const weightRegex = /type="HKQuantityTypeIdentifierBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
```

**New patterns needed**:
```typescript
const bodyFatRegex = /type="HKQuantityTypeIdentifierBodyFatPercentage"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const leanMassRegex = /type="HKQuantityTypeIdentifierLeanBodyMass"[^>]*unit="kg"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
const caloriesRegex = /WorkoutStatistics.*ActiveEnergyBurned.*sum="([^"]+)".*kcal/; // Already shown in workout context
const vo2maxRegex = /type="HKQuantityTypeIdentifierVO2Max"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/;
```

### Data Normalization

**Body Fat Percentage**: Stored as decimal (0.326), display as percentage (32.6%)
**Lean Body Mass**: Stored as kg, matches weight units
**Calories**: Integer kcal values
**VO2Max**: Float values (e.g., 38.2)

### API Routes Needed

- `GET /api/body-composition` - Fetch body comp history
- `GET /api/vo2max` - Fetch VO2Max history
- Update `GET /api/activity-stats` to include calories burned

---

## Medical Context: Why This Matters

### Bariatric Patient Success Metrics

**Traditional view** (WRONG): Success = weight loss
**Medical reality** (RIGHT): Success = fat loss + muscle preservation + improved metabolic health

### The Hidden Problem

Post-bariatric patients commonly experience:
- Rapid initial weight loss (good)
- Muscle loss alongside fat loss (bad)
- Weight plateau (neutral - depends on composition)
- Regain (could be muscle gain = good, or fat regain = bad)

**Without body composition tracking, you can't tell the difference.**

### Example Scenarios

**Scenario A**: Weight stable at 90kg for 3 months
- **Without composition**: "I'm stuck, not losing weight, frustrated"
- **With composition**: "Lost 3kg fat, gained 3kg muscle, huge win!"

**Scenario B**: Weight up 2kg this month
- **Without composition**: "I'm regaining, failure"
- **With composition**: "Gained 2.5kg muscle, lost 0.5kg fat, strength training working!"

**Scenario C**: Weight down 5kg this month
- **Without composition**: "Great progress!"
- **With composition**: "Lost 2kg fat, 3kg muscle - eating too few calories, need more protein!"

### Clinical Guidelines for Post-Bariatric Patients

**Protein targets**: 60-80g/day (1.5g per kg ideal body weight)
**Exercise**: Resistance training to preserve lean mass
**Goal**: Lose fat while maintaining/building muscle
**Success marker**: Body composition, not just weight

**This app can help track the right metrics.**

---

## Conclusion

The Apple Health export contains **rich, valuable data** that's currently unused.

**Priority 1**: Body composition (fat % + lean mass) is **critical** for bariatric context and transforms the app from a weight tracker into a comprehensive body composition tool.

**Priority 2**: Workout calories complete the activity picture with actual energy expenditure.

**Priority 3**: VO2Max and HRV add valuable fitness and recovery insights.

**Implementation path**: Phase 1 (body comp + calories) → user feedback → Phase 2 (VO2Max, flights) → Phase 3 (HRV for AI).

---

**Questions for User**:
1. Agree with Phase 1 priority (body comp + workout calories)?
2. Display preference: Stats cards vs chart integration vs dedicated tab?
3. Should we start implementation now or want more analysis?
