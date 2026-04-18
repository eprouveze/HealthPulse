# SleeveCoach — Product Requirements Document

**Version**: 0.1 (draft)
**Status**: Pre-development
**Owner**: Founder / sole developer
**Last updated**: 2026-04-18

---

## 1. Overview

SleeveCoach is a native iOS app for sleeve gastrectomy (VSG) patients, designed to provide continuous, data-informed support from pre-op preparation through the five-year rebound risk window. It ingests Apple HealthKit data directly (no manual import), applies bariatric-aware AI coaching via the Claude API, and tracks the behaviors that actually predict long-term success: protein intake, hydration, vitamin compliance, and early detection of weight drift.

The product exists because the bariatric patient journey has a catastrophic support gap: after discharge, patients receive a binder and a follow-up appointment schedule, then are largely on their own for the remaining 95% of the behavior-change period. Generic fitness apps actively harm this population by normalizing calorie deficits that are dangerous post-op, shaming walking as exercise, and ignoring the specific nutritional protocol sleeve patients require.

## 2. Problem Statement

**For** post-sleeve-gastrectomy patients (0–60 months post-op)
**Who** need continuous behavioral support between rare clinical check-ins
**SleeveCoach is** an iOS app
**That** ingests HealthKit data automatically and provides bariatric-aware AI coaching, vitamin protocol tracking, phase-based dietary guidance, and rebound risk monitoring
**Unlike** Baritastic (the incumbent, which is a dated food logger with no coaching intelligence) and generic fitness apps (which give actively wrong advice for this population)
**Our product** understands the bariatric protocol deeply, respects the user's data via on-device-first architecture, and alerts to rebound risk *before* it becomes regain.

## 3. Goals & Non-Goals

### v1 Goals
- Zero-friction HealthKit onboarding (under 2 minutes from install to first useful screen)
- Reliable AI coaching that demonstrates domain knowledge (protein targets, dumping syndrome, phase protocols)
- Vitamin compliance tracking that meaningfully improves adherence
- Shareable progress artifact (chart/card) suitable for family, clinical check-ins, or community posts
- Sustainable subscription economics: <$0.50/user/month in AI costs at default engagement

### v1 Non-Goals (explicit)
- Apple Watch app — deferred to v2
- Community / social feed — moderation cost too high for v1
- Recipe database or meal planning — saturated, non-differentiating
- Other bariatric procedures (RNY, DS, band) — start narrow
- Surgeon/clinic B2B sales — deferred
- Android — iOS-only, HealthKit-dependent
- Mac Catalyst — HealthKit not supported on macOS
- Live weight-loss leaderboards — ED risk too high

### Success Criteria (12 months post-launch)
- 100+ paying subscribers
- >60% 3-month retention on Pro tier
- >4.5 App Store rating with 50+ reviews
- AI coach "was this helpful?" positive rate >70%

## 4. Target Users

### Primary persona: "Maya, Month 4 post-op"
- 34, tech-adjacent professional, sleeve 4 months ago
- Initial euphoria fading, hit first stall at week 10
- Struggles with protein target (gets ~45g vs 80g target)
- Takes vitamins inconsistently
- Active in r/gastricsleeve, follows bariatric creators on TikTok
- Willing to pay $10/mo for something that "actually gets it"

### Secondary persona: "David, Year 2 post-op"
- 48, lost 120 lbs initially, regained 25 lbs over last 8 months
- Stopped tracking ~month 14 after hitting goal
- Doesn't realize his step count has quietly dropped from 9k to 5k/day
- Will pay for a tool that catches drift early and explains it

### Tertiary persona: "Sarah, Pre-op (6 weeks out)"
- 41, anxious about liquid diet, surgery prep
- High engagement, low monetization (converts to primary after surgery)

## 5. Jobs To Be Done

1. "Tell me if my trajectory is normal for someone at my post-op month"
2. "Help me hit my protein and hydration targets without micromanaging every bite"
3. "Make sure I don't slip on vitamins — the long-term consequences terrify me"
4. "Show me progress I can share with my partner/support person"
5. "Catch it if I start regaining, before it becomes undeniable"
6. "Explain what's happening when I stall, dump, or feel off — with bariatric context, not generic advice"

## 6. Information Architecture

### Tab structure (5 tabs, bottom nav)

1. **Today** — landing screen; today's protein/hydration/vitamin status, weight trend sparkline, AI coach nudge card, phase reminder
2. **Progress** — full weight chart, %EWL/%TWL, body composition trend, shareable card export, streaks
3. **Coach** — conversational AI coach; shows recent conversations and a "new message" composer
4. **Log** — food/protein/water entries, vitamin check-off, dumping log, manual weight entry (if HealthKit absent)
5. **Me** — profile, surgery date, goals, subscription, settings, vitamin protocol config, HealthKit permissions

### Key flows

**First-run onboarding** (target: <120 seconds)
1. Welcome / value prop (1 screen)
2. HealthKit permission request (explain what we read and why)
3. Surgery info: surgery date, pre-op weight, goal weight, height
4. Vitamin protocol: confirm/customize default multivitamin + B12 + calcium citrate + D3 + iron schedule
5. Optional: progress photo baseline (on-device, never uploaded)
6. Land on Today tab with first coach message pre-generated

**Daily-use flow** (target: <30 seconds)
- Open app → Today tab shows: weight trend, today's targets vs actual, tap-to-log vitamin, coach nudge
- 80% of day-to-day value should be visible without navigation

**Post-op phase progression** (weeks 0–8)
- App detects current post-op week from surgery date
- Shows current phase (liquid / puree / soft / solid) with food guidance
- Gentle milestone celebration at each phase transition

## 7. Functional Requirements

### 7.1 HealthKit Integration

**Required HealthKit types (read)**:
- `bodyMass` — weight
- `bodyFatPercentage`, `leanBodyMass`, `bodyMassIndex` — body composition
- `stepCount`, `flightsClimbed`, `distanceWalkingRunning` — activity
- `activeEnergyBurned`, `basalEnergyBurned` — calorie context
- `heartRate`, `restingHeartRate`, `heartRateVariabilitySDNN` — cardio signals
- `vo2Max` — fitness marker
- `sleepAnalysis` — sleep duration and quality
- `dietaryProtein`, `dietaryWater` — if user logs in Apple Health or third-party apps
- `workoutType` (via `HKWorkout`) — exercise sessions

**Write types**: None in v1. App is read-only to HealthKit. User-entered food/water/vitamin data stays in app-local storage.

**Observer queries**: Set up `HKObserverQuery` with background delivery for weight, steps, workouts, sleep. Daily silent refresh at minimum.

**Permission strategy**: Request all at once during onboarding with clear explanation. Handle partial grants gracefully (e.g., user denies sleep — feature disabled, not broken).

**Fallback**: If HealthKit denied entirely, app still works with manual entry for weight; coach degraded but functional.

### 7.2 Weight Tracking & Chart

**Data sources**: HealthKit (primary), manual entry (fallback).

**Display**:
- Main chart: line/area chart, X-axis date, Y-axis weight (kg or lb per user pref)
- Overlay: goal weight line, surgery date marker, phase transition markers
- Secondary: body fat % trend, lean mass trend (on toggle)
- Time windows: 7d, 30d, 90d, 1y, all-time

**Calculated metrics**:
- %TWL = (pre-op weight − current) / pre-op weight × 100
- %EWL = (pre-op weight − current) / (pre-op weight − ideal weight at BMI 25) × 100
- Rate of loss (lb/week) — 4-week rolling
- Expected-vs-actual curve overlay (based on published VSG outcome data)

**Shareable card**:
- Export as image (PNG, 1080×1920 for stories, 1080×1080 for feed)
- Customizable: show/hide absolute weights, show/hide %TWL, watermark off by default (on-brand but optional)
- Privacy: user controls every data point visible before sharing

### 7.3 AI Coach

**Model strategy**:
- Default: Claude Sonnet 4.6 for weekly deep-dive and user-initiated conversations
- Haiku 4.5 for routine daily nudges (cheaper, faster)
- Opus 4.7 reserved for "explain this pattern" deep analysis on user request (premium action)

**Prompt architecture**:
- System prompt: bariatric-aware persona, safety constraints, tone guidelines
- Context injection (always present):
  - Surgery type + date + post-op week/month
  - Last 30d weight trend + %TWL + %EWL
  - Last 7d protein/hydration/vitamin compliance
  - Last 7d activity (steps, workouts)
  - Last 7d sleep average
  - Recent stalls or notable events (dumping logged, deviation from phase protocol)
  - User's stated goals
- Message-specific context: the current question or daily check-in data

**Coach interaction types**:
1. **Daily nudge** (automatic, Haiku): short message on Today tab responding to the last 24h data
2. **Weekly reflection** (automatic, Sonnet, Sunday evening): deeper analysis of the week's patterns
3. **Ask Coach** (on-demand, Sonnet): user-initiated conversation, full history in context
4. **Pattern explainer** (on-demand, Opus, premium): deep dive on a flagged pattern like "why am I stalling?"

**Safety constraints in system prompt**:
- Never diagnose or recommend medication/supplement doses
- Always defer serious symptoms to surgeon/dietitian
- No calorie-deficit prescriptions (dangerous post-sleeve)
- Watch for ED signals (fixation on scale, restrictive language escalation) and gently redirect
- Never claim to replace medical care

**Streaming**: Yes. Responses stream token-by-token for perceived speed.

**Caching**: Use Anthropic prompt caching for the system prompt + long-lived user context block. Dramatically reduces cost for chatty users.

### 7.4 Vitamin & Supplement Tracker

**Default protocol** (user-editable; based on ASMBS guidelines — user confirms with their own surgeon):
- Bariatric multivitamin — 2x daily
- Vitamin B12 (sublingual 500mcg or injection schedule) — daily
- Calcium citrate 500–600mg — 2–3x daily (not with iron, spaced 2+ hours)
- Vitamin D3 3000 IU — daily
- Iron 45–65mg (especially menstruating patients) — daily

**Features**:
- Customizable schedule: pill name, dose, time, frequency
- Local notifications at scheduled times
- Quick tap-to-log from notification or Today tab
- Monthly compliance % on Progress tab
- Warning if critical vitamins (B12, D3) have been missed 3+ days

**Critical constraint**: Never auto-increase doses. Never recommend new supplements. Always frame as "track what your surgeon prescribed."

### 7.5 Phase-Based Guidance (Post-Op Weeks 0–8)

**Auto-detected phase** based on weeks since surgery date:
- **Week 1**: Clear liquids
- **Week 2**: Full liquids (protein shakes)
- **Weeks 3–4**: Pureed foods
- **Weeks 5–6**: Soft foods
- **Week 7+**: Regular foods (pouch rules apply forever)

**Each phase provides**:
- What to eat (examples, brief)
- What to avoid
- Portion targets (oz/ml)
- Common issues at this phase and what to do
- Protein target for the phase
- Hydration target for the phase
- "Transition to next phase" checklist

**Tone**: Not prescriptive medical advice. Framed as "common guidance from bariatric programs — confirm with yours."

### 7.6 Nutrition Logging (Protein + Hydration focused)

**Philosophy**: Not a calorie tracker. Bariatric patients who calorie-count obsessively have worse outcomes. We track protein, hydration, and problematic foods.

**Entries**:
- Protein: log food description → AI estimates protein grams → user confirms. Running daily total.
- Water: quick-add common sizes (8oz, 16oz, bottle). Daily total vs target.
- Optional: energy level 1–5, "head hunger" flag, physical hunger 1–5

**Nutrition sprints** (ported from HealthPulse, renamed):
- "Protein Focus Week" — 7 day challenge to hit protein target daily
- "Hydration Challenge" — 10 days to hit 64oz+ daily
- "Stall Breaker" — 14 day structured re-engagement after plateau detected

### 7.7 Dumping Syndrome Log

**Entry fields**:
- Time of episode
- Time since last meal
- What was eaten (free text + AI categorization)
- Symptoms (nausea, sweating, palpitations, diarrhea, dizziness)
- Severity 1–5

**Pattern detection**:
- After 5+ episodes, app identifies common trigger foods/timing
- Coach references pattern in weekly reflection
- Exportable to share with dietitian

### 7.8 Rebound Risk Monitor (Premium, Year 2+)

**Activates automatically** at 18 months post-op (user can manually enable earlier).

**Signal inputs** (4-week rolling windows):
- Weight trend slope (lb/week)
- Step count drift from user's baseline
- Protein logging frequency (proxy for engagement)
- Vitamin compliance %
- Sleep duration change
- Gap between app opens

**Risk tiers**:
- **Green**: no concerning drift
- **Yellow**: one or two signals drifting; gentle coach nudge
- **Orange**: multiple signals; coach proactively suggests specific actions
- **Red**: sustained regain trajectory; coach suggests surgeon follow-up

**Algorithm sketch** (v1, to be tuned with data):
```
risk_score =
    0.35 * weight_slope_normalized
  + 0.20 * step_drift_normalized
  + 0.15 * protein_log_gap_normalized
  + 0.15 * vitamin_compliance_deficit
  + 0.10 * sleep_change_normalized
  + 0.05 * app_inactivity_normalized

Thresholds: <0.3 green, 0.3–0.5 yellow, 0.5–0.75 orange, >0.75 red
```

Refined over time with actual user cohort data. Transparent to user — they can see what's contributing.

### 7.9 Progress Photos

- Stored on-device only (Photos Kit; never uploaded)
- Monthly cadence reminder
- Comparison slider: any two photos side-by-side
- Include in shareable export only on explicit user action

### 7.10 Gamification

**Philosophy**: Celebrate behaviors, not weight loss numbers. No leaderboards. No social comparison.

**Milestone types**:
- Phase transitions (week 1, 2, 4, 6, 8 post-op)
- Anniversary milestones (1mo, 3mo, 6mo, 1yr, 2yr, 5yr)
- Behavior streaks (7/30/90 day vitamin adherence, protein target, hydration target)
- "First" milestones (first walk, first gym, first solid meal, first NSV logged)
- Stall conquered (weight loss resumes after 14+ day stall)

**Visualization**: Badge collection in Progress tab; subtle celebration animation on unlock; never a notification-interrupt.

## 8. Data Model

### Swift struct sketches (actual implementation will use GRDB or SwiftData)

```swift
struct UserProfile {
    let id: UUID
    let surgeryDate: Date
    let surgeryType: SurgeryType  // .sleeve (v1 only)
    let preOpWeightKg: Double
    let goalWeightKg: Double
    let heightCm: Double
    let sex: BiologicalSex
    let birthYear: Int
    var units: Units  // .metric, .imperial
}

struct WeightEntry {
    let id: UUID
    let date: Date
    let weightKg: Double
    let source: Source  // .healthKit, .manual, .smartScale
    let deviceName: String?
}

struct VitaminProtocol {
    let id: UUID
    var items: [VitaminItem]
}

struct VitaminItem {
    let id: UUID
    var name: String
    var dose: String
    var schedule: [Int]  // hours of day, 0-23
    var criticalityLevel: Criticality  // .critical (B12, D3), .standard
}

struct VitaminLog {
    let itemId: UUID
    let timestamp: Date
    let taken: Bool
}

struct ProteinEntry {
    let id: UUID
    let timestamp: Date
    let description: String
    let proteinGrams: Double
    let source: Source  // .aiEstimated, .manual
    let confidence: Double?  // 0-1, only for AI estimates
}

struct HydrationEntry {
    let id: UUID
    let timestamp: Date
    let volumeMl: Double
}

struct DumpingEpisode {
    let id: UUID
    let timestamp: Date
    let minutesSinceLastMeal: Int
    let foodsEaten: String
    let symptoms: Set<DumpingSymptom>
    let severity: Int  // 1-5
}

struct CoachMessage {
    let id: UUID
    let timestamp: Date
    let role: Role  // .user, .assistant, .system
    let content: String
    let modelUsed: String?
    let tokensUsed: Int?
}

struct PhaseTransition {
    let fromPhase: Phase
    let toPhase: Phase
    let date: Date
    let acknowledged: Bool
}

struct ReboundSignalSnapshot {
    let date: Date
    let weightSlopeNormalized: Double
    let stepDriftNormalized: Double
    let proteinLogGapNormalized: Double
    let vitaminComplianceDeficit: Double
    let sleepChangeNormalized: Double
    let appInactivityNormalized: Double
    let compositeRiskScore: Double
    let tier: RiskTier  // .green, .yellow, .orange, .red
}
```

All data is local-first. Cloud sync (if offered) is opt-in via CloudKit in a future version.

## 9. Non-Functional Requirements

### Privacy & Security
- All health data stays on-device except AI coach requests
- AI requests send only the necessary context window, never raw HealthKit samples
- No analytics tied to health data values; only anonymized usage counts
- User can export all data (JSON) at any time
- User can delete account and wipe all data (including any server-side coach history if stored)
- Progress photos never leave device unless user exports/shares explicitly
- Privacy policy: clear, readable, no dark patterns
- App Tracking Transparency: no tracking; request never shown

### Performance
- Cold start to usable Today tab: <2 seconds on iPhone 13 and newer
- HealthKit sync: non-blocking; data appears progressively
- AI coach first-token latency: <2 seconds (leveraging prompt caching)
- Chart rendering: 60fps scroll on 5-year data range

### Accessibility
- Full VoiceOver support including chart data
- Dynamic Type up to XXXL
- Sufficient color contrast in all themes
- Reduced motion respected for celebration animations
- Haptics optional, not required for function

### Reliability
- Offline-capable: all features work without network except AI coach
- Graceful degradation: if AI service down, clearly indicate and queue for later
- No data loss on crash: all writes durably persisted before UI confirmation

### Localization
- v1: English only
- v2 priorities: Spanish, French (based on request volume)
- All copy externalized from day one

## 10. Monetization & Subscription UX

### Free tier (forever-free)
- HealthKit sync
- Weight chart (full history)
- Shareable progress card
- Vitamin tracker with reminders
- Phase guidance (weeks 0–8)
- Manual protein + hydration logging
- Basic milestones/badges

### Pro tier ($9.99/mo or $79/yr)
- AI Coach (all interaction types)
- AI-estimated protein from food descriptions
- Nutrition sprints
- Dumping syndrome pattern detection
- Rebound risk monitor
- Doctor export (PDF report)
- Progress photos comparison
- Expected-vs-actual curve overlay

### Lifetime ($199, first 100 buyers only)
- Everything in Pro, forever
- Founder badge
- Direct input channel to roadmap

### Upgrade prompts
- Never interruptive during core flows
- Contextual: "Ask Coach" tab shows paywall only when user taps it for the first time
- 7-day free trial on monthly; 14-day on annual
- StoreKit 2, compliant with App Store subscription guidelines

### Pricing principles
- No dark patterns, no forced annual billing
- Cancel anytime, in-app
- Family Sharing: not in v1 (medical data nuance)

## 11. Success Metrics

### Activation
- % of installs completing onboarding: target >70%
- % granting HealthKit permissions: target >85%
- Time to first coach message: target <3 minutes

### Engagement
- DAU/MAU: target >40% (health tracking norm is ~25%, our niche will be higher)
- 7-day retention: target >60%
- 30-day retention: target >40%
- Coach messages per active user per week: target 3–5

### Monetization
- Free-to-paid conversion: target >5% within 30 days
- Paid retention (3-month): target >60%
- Paid retention (12-month): target >40%
- ARPU: target ~$7/month after Apple take

### Health outcomes (observational, not clinical claim)
- % of users hitting protein target daily: track and report in aggregate
- % vitamin compliance: track and report in aggregate
- Rebound signal distribution across cohort: monitor for algorithm tuning

## 12. Analytics Events (v1)

All events anonymized, no health values attached.

- `onboarding_started`
- `onboarding_step_completed` (step_name)
- `healthkit_permission_granted` (types_granted_count)
- `onboarding_completed`
- `weight_chart_viewed`
- `shareable_card_exported`
- `vitamin_logged`
- `vitamin_notification_tapped`
- `protein_entry_created` (source: manual|ai)
- `hydration_entry_created`
- `dumping_episode_logged`
- `coach_message_sent`
- `coach_message_received` (model, duration_ms, cached: bool)
- `pattern_explainer_requested`
- `paywall_viewed` (trigger)
- `subscription_started` (tier, trial: bool)
- `subscription_canceled` (tier, duration_days)
- `rebound_tier_changed` (from, to)
- `app_opened`
- `app_backgrounded` (session_duration_s)

## 13. Launch Criteria

### TestFlight (closed beta) criteria
- All v1 goal features functional
- Crash-free rate >99% on internal testing across iPhone 12, 13, 14, 15, 16
- HealthKit permission flow works correctly including partial grants
- AI coach has been evaluated on 20+ bariatric scenarios by founder and 2–3 trusted bariatric contacts
- Privacy policy drafted and reviewed
- Basic analytics wired up

### App Store submission criteria
- All TestFlight criteria PLUS
- 10+ beta users have used app for 14+ days without critical issues
- Subscription flow tested end-to-end with StoreKit sandbox
- Screenshots produced for all required device sizes
- App Store Connect metadata complete (description, keywords, categories: Health & Fitness primary)
- Privacy manifest correct per Apple 2024 requirements
- HealthKit usage descriptions reviewed by App Review-aware contact

### Post-launch monitoring (first 30 days)
- Daily crash rate check
- Weekly coach quality sampling (anonymized, opt-in)
- Support email response <24h
- App Store review response within 48h

## 14. Risks & Open Questions

### Known risks
- **App Review for HealthKit apps** — Apple scrutinizes health claims carefully. Mitigation: conservative copy, no "lose weight" promises, position as "track + reflect + coach."
- **AI safety in medical context** — coach says something harmful. Mitigation: rigorous system prompt constraints, disclaimer on every coach screen, ongoing evaluation harness.
- **Solo founder operational load** — support volume scales with user count. Mitigation: self-service docs, in-app FAQ, community forum deferred to reduce moderation load.
- **Subscription churn in health apps is historically high** — Mitigation: rebound monitor is a year-2 retention weapon; annual plans with discount improve LTV.

### Open questions (to resolve before month-3 build milestone)
- Persistence: GRDB vs SwiftData? Lean GRDB (proven, SQL-native, matches HealthPulse mental model).
- Should AI coach history sync via CloudKit or stay device-local? Lean device-local for v1, opt-in sync in v2.
- Exact protein target algorithm — fixed (60g default), weight-based (1.5g/kg lean mass), or phase-based? Lean phase-based with user override.
- Do we offer a coach character/persona choice, or single voice? Lean single voice for v1 (consistency signal).
- How do we handle users who transition from other bariatric procedures (revision surgery)? Lean: v1 sleeve-only, collect data on demand.
- Pricing: should annual be $79 or $89? Monitor conversion; easy to adjust.

## 15. Milestones

### M0 — Spec & setup (Month 0, ~2 weeks)
- PRD finalized
- Xcode project scaffolded
- GRDB integration + schema
- HealthKit entitlement + Info.plist descriptions
- Anthropic SDK integration stub
- StoreKit configuration

### M1 — Core data loop (Month 1)
- HealthKit read for weight, steps, sleep, body composition
- Weight chart with Swift Charts
- Surgery date → post-op week calculation
- Today tab populated with real data

### M2 — AI Coach v1 (Month 2)
- System prompt port from HealthPulse, recut for bariatric
- Context injection pipeline
- Streaming chat UI
- Daily nudge generation (Haiku)
- Prompt caching wired up

### M3 — Vitamins + Phase + Nutrition (Month 3)
- Vitamin protocol + local notifications
- Phase guidance content library (manually authored)
- Protein logging with AI estimation
- Hydration logging

### M4 — Polish + TestFlight (Month 4)
- Shareable progress card
- Gamification / badges
- Onboarding flow
- TestFlight release to 10 beta users

### M5 — App Store launch (Month 4–5)
- Free tier live
- Subscription tier behind paywall, but disabled for initial 30 days to gather organic usage

### M6 — Pro tier live (Month 6)
- Subscription enabled
- Rebound risk monitor shipped (inactive for <18mo users)
- Dumping pattern detection
- Doctor export (PDF)

### M9 — Retention features (Month 9)
- Rebound monitor validated against cohort data
- Creator partnerships
- First cohort retention analysis

### M12 — Review gate
- Evaluate against success metrics
- Decide: double down, maintain, or sunset to personal tool

## 16. Out of Scope (v1) — parking lot for future

- Apple Watch companion (quick log, vitamin notifications)
- iPad optimized layout
- CloudKit sync for multi-device
- Community features (moderated forum, accountability partner)
- RNY / DS / band surgery support
- Bariatric surgeon B2B portal
- Pharmacy integration for vitamin reordering
- Integration with MyFitnessPal / Cronometer for food logging import
- Localization (ES, FR, DE)
- Android

---

## Appendix A: HealthPulse code reuse inventory

| HealthPulse artifact | Reuse path for SleeveCoach |
|---|---|
| `src/app/api/coach/route.ts` — system prompt + context assembly | Port prompt text; reimplement assembly in Swift |
| `src/lib/analysis.ts` — trend detection | Port math to Swift |
| Gamification rules (XP, streaks, badges) | Port rules, retheme for bariatric milestones |
| `src/lib/schema.ts` — table shapes | Map to Swift structs + GRDB tables |
| Nutrition sprint logic | Port as-is, rename to "focus challenges" |
| Recharts configuration (visual style) | Port visual language to Swift Charts |
| XML import pipeline | Discard — replaced by HealthKit |
| Next.js API routes (non-coach) | Discard — move to Swift services |
| Drizzle migrations | Discard — use GRDB migration API |

## Appendix B: Regulatory posture

SleeveCoach is a **wellness app**, not a medical device. It does not:
- Diagnose conditions
- Treat conditions
- Recommend dosing of medications or supplements
- Replace medical supervision

It does:
- Track user-entered and HealthKit-sourced data
- Provide educational information about common bariatric protocols
- Offer AI-assisted reflection on user's own data
- Remind users of their own prescribed vitamin regimen

Privacy compliance targets: App Store privacy requirements (Apple), GDPR (EU users), CCPA (California). HIPAA does not apply to consumer apps not covered by a BA agreement; we do not pursue HIPAA compliance in v1.

All coach outputs include a visible disclaimer linking to full "not medical advice" language.

