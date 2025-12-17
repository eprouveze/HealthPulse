# WeightTracker UI/UX Improvements PRD

## Overview

**Product**: WeightTracker Desktop Application
**Platform**: macOS (desktop-only)
**User**: Single user (personal use)
**Document Version**: 1.0
**Date**: 2025-12-17

### Objective

Transform WeightTracker from a functional data dashboard into an engaging, well-organized weight management companion with improved visual hierarchy, enhanced gamification, and streamlined interactions.

### Out of Scope

- Accessibility compliance (WCAG)
- Mobile/responsive optimizations
- Onboarding flows
- Multi-user features

---

## Problem Statement

The current implementation suffers from:

1. **Information Overload**: 10+ sections with equal visual weight on a single page
2. **No Clear Focal Point**: User's eye doesn't know where to look first
3. **Weak Visual Design**: Monotonous grays, minimal personality, generic aesthetic
4. **Underutilized Gamification**: Plain text badges, no celebration animations, static quests
5. **Buried Key Actions**: Goal setting hidden in settings, daily check-in at bottom
6. **Limited Chart Interactivity**: No annotations, basic tooltips, no export options

---

## Goals & Success Criteria

| Goal | Success Metric |
|------|----------------|
| Reduce cognitive load | User can identify current weight in <1 second |
| Increase engagement | Daily check-in completion visible above fold |
| Make gamification motivating | Celebration animations on achievements |
| Improve data exploration | Chart annotations and enhanced tooltips |
| Streamline navigation | Tab-based organization reduces scrolling |

---

## Feature Requirements

### 1. Visual Hierarchy Restructure

**Priority**: High
**Effort**: Medium

#### 1.1 Hero Section (New)

Create a prominent "Today" hero section as the primary focal point.

**Requirements:**
- Display current weight in large typography (48-56px)
- Show weight change indicator (↓/↑ with value)
- Progress bar to goal with percentage
- Current streak display (if active)
- Quick action buttons: "Log Weight", "Daily Check-in"

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│                   Current Weight                     │
│                      78.5 kg                        │
│                   ↓ 1.2 kg this week                │
│                                                      │
│  ████████████████████░░░░░░░  75% to goal          │
│  12.3 kg lost · 4.2 kg remaining                    │
│                                                      │
│  🔥 7 Day Streak    ⭐ Level 5    💎 450 XP         │
│                                                      │
│  [ Log Weight ]    [ Daily Check-in ]               │
└─────────────────────────────────────────────────────┘
```

#### 1.2 Section Reorganization

**New Page Structure:**
1. Header (app name, settings icon)
2. **Hero Section** (new - always visible)
3. Milestones Banner (conditional - only when earned)
4. Progress Chart (full width)
5. Stats Grid (4 columns)
6. **Tabbed Content Area** (new):
   - Tab 1: Activity & Insights
   - Tab 2: AI Coach
   - Tab 3: Gamification
   - Tab 4: Trends & History

#### 1.3 Collapsible Sections

**Requirements:**
- Trend Analysis: Collapsible, default collapsed
- Recent Entries: Collapsible, default collapsed
- Preserve collapse state in localStorage

---

### 2. Visual Design Enhancement

**Priority**: High
**Effort**: Medium

#### 2.1 Color Palette Update

**Current**: Mostly grays and muted colors
**Proposed**: Health/wellness theme with semantic meaning

```css
/* Primary Actions */
--primary: hsl(210, 100%, 45%);        /* Vibrant blue */
--primary-hover: hsl(210, 100%, 40%);

/* Semantic Colors */
--weight-loss: hsl(142, 76%, 36%);     /* Green - progress */
--weight-gain: hsl(0, 72%, 51%);       /* Red - attention */
--weight-stable: hsl(210, 11%, 71%);   /* Gray - neutral */

/* Gamification */
--xp-gold: hsl(45, 93%, 47%);          /* Gold - achievements */
--streak-fire: hsl(25, 95%, 53%);      /* Orange - streaks */
--level-purple: hsl(250, 75%, 60%);    /* Purple - levels */

/* Backgrounds */
--card-highlight: linear-gradient(135deg, white, hsl(210, 100%, 97%));
--achievement-bg: linear-gradient(135deg, hsl(45, 100%, 95%), hsl(35, 100%, 92%));
```

#### 2.2 Card Styling

**Requirements:**
- Add subtle gradients to high-priority cards
- Increase shadow depth for visual hierarchy
- Add hover states with elevation change
- Use colored left borders to indicate card type

**Example Treatments:**
```typescript
// Hero card - prominent
className="border-l-4 border-primary shadow-lg bg-gradient-to-br from-white to-primary/5"

// Achievement card - celebratory
className="border-l-4 border-yellow-400 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50"

// Standard card - subtle
className="border shadow-sm hover:shadow-md transition-shadow"
```

#### 2.3 Typography Hierarchy

**Requirements:**
- Hero weight: 48-56px, bold, monospace for numbers
- Section headers: 20-24px, semibold
- Card titles: 16-18px, medium
- Body text: 14-16px, regular
- Labels: 12-14px, medium, muted

#### 2.4 Micro-interactions

**Requirements:**
- Button hover: Slight scale (1.02) + shadow increase
- Card hover: Elevation increase (shadow-md → shadow-lg)
- Progress bars: Animated fill on load
- Transitions: 200ms ease-in-out default

---

### 3. Gamification Enhancement

**Priority**: High
**Effort**: Medium-High

#### 3.1 Celebration Animations

**Requirements:**
- Level up: Full-screen modal with trophy animation + confetti
- Badge earned: Slide-in notification with badge icon + sparkle effect
- Streak milestone (7, 30, 100 days): Special celebration modal
- Goal reached: Confetti explosion + congratulations modal

**Implementation:**
- Use Framer Motion for animations
- Add canvas-confetti for particle effects
- Respect user's motion preferences (prefers-reduced-motion)

**Level Up Modal:**
```
┌─────────────────────────────────────┐
│           🏆 LEVEL UP! 🏆           │
│                                     │
│      You've reached Level 6!        │
│                                     │
│    +100 XP bonus for leveling up    │
│                                     │
│         [ Continue ]                │
└─────────────────────────────────────┘
```

#### 3.2 Visual Badge Showcase

**Current**: Plain text list
**Proposed**: Visual grid with badge icons

**Requirements:**
- 3-4 column grid of badge cards
- Each badge shows: Icon (large), Name, Description, Earned date
- Unearned badges shown grayed out with "???" or lock icon
- Hover effect: Scale up + glow
- Click: Show badge details modal

**Badge Card Design:**
```
┌───────────────┐
│      🏃       │  (large icon)
│   Marathon    │  (name)
│  ───────────  │
│ 100k steps in │  (description)
│   one week    │
│               │
│ ✓ Earned      │  (status + date)
│   Dec 15      │
└───────────────┘
```

#### 3.3 Streak Calendar Heatmap

**Requirements:**
- Show last 30 days as grid (7 columns x 5 rows)
- Color intensity based on activity level
- Today highlighted with border
- Hover: Show date + logged weight
- Display current streak and longest streak

**Layout:**
```
Streak: 7 days 🔥  |  Longest: 23 days

  M   T   W   T   F   S   S
┌───┬───┬───┬───┬───┬───┬───┐
│ ░ │ ░ │ █ │ █ │ █ │ ░ │ ░ │
├───┼───┼───┼───┼───┼───┼───┤
│ █ │ █ │ █ │ █ │ █ │ █ │ █ │
├───┼───┼───┼───┼───┼───┼───┤
│ █ │ █ │ █ │ █ │ █ │ █ │ █ │
├───┼───┼───┼───┼───┼───┼───┤
│ █ │ █ │ █ │[█]│   │   │   │  ← [█] = today
└───┴───┴───┴───┴───┴───┴───┘

░ = missed  █ = logged  [ ] = today
```

#### 3.4 Personalized Quests

**Current**: Static daily quests
**Proposed**: Dynamic quests based on user behavior

**Quest Types:**
- **Consistency**: "Log weight 5 more times this week" (based on current week's logs)
- **Streak**: "Extend your streak to 10 days" (based on current streak)
- **Activity**: "Hit 10,000 steps today" (based on average + stretch goal)
- **Check-in**: "Complete 3 daily check-ins this week"

**Requirements:**
- Generate 2-3 quests per day
- Show progress bar for each quest
- XP reward displayed
- Completed quests show checkmark + "Claim XP" button

---

### 4. Chart Improvements

**Priority**: Medium
**Effort**: Medium

#### 4.1 Enhanced Tooltips

**Current**: Basic weight + date
**Proposed**: Rich contextual information

**Tooltip Content:**
```
┌─────────────────────────────┐
│  December 15, 2025          │
│  ────────────────────────   │
│  Weight: 78.5 kg            │
│  Change: -0.3 kg from prev  │
│  ────────────────────────   │
│  Steps: 8,234               │
│  Workouts: 1                │
│  ────────────────────────   │
│  📝 Click to add note       │
└─────────────────────────────┘
```

#### 4.2 Quick View Presets

**Current**: Separate timespan + precision controls
**Proposed**: Smart presets + advanced options

**Quick Presets:**
- "This Week" (7d, daily)
- "This Month" (30d, daily)
- "This Quarter" (90d, weekly)
- "This Year" (1y, weekly)
- "All Time" (all, monthly)

**Requirements:**
- Preset buttons as primary controls
- "Custom" option reveals timespan + precision dropdowns
- Remember last selection in localStorage

#### 4.3 Annotations

**Requirements:**
- Click data point to add/edit note
- Notes displayed as small markers on chart
- Note icon in legend toggles visibility
- Notes stored with weight entries
- Example notes: "Vacation", "Sick", "Started diet", "Holiday"

#### 4.4 Export Options

**Requirements:**
- "Export" button in chart header
- Options: PNG image, CSV data
- PNG: Current chart view with title + date range
- CSV: Date, Weight, Steps, Workouts, Notes columns

---

### 5. Navigation & Layout

**Priority**: Medium
**Effort**: Low-Medium

#### 5.1 Tab-Based Content Organization

**Requirements:**
- Implement tabs below the stats grid
- Tabs: Activity | Insights | AI Coach | Gamification
- Tab state persisted in localStorage
- Smooth transition between tabs

**Tab Content:**

| Tab | Content |
|-----|---------|
| Activity | Activity correlation card, Recent workouts |
| Insights | AI-generated insights, Trend analysis |
| AI Coach | Chat interface, Preset questions |
| Gamification | XP/Level, Badges, Quests, Streak calendar |

#### 5.2 Floating Action Button

**Requirements:**
- Fixed position bottom-right
- Primary action: Quick weight log
- Click opens modal with:
  - Weight input (number, 0.1 step)
  - Date picker (defaults to today)
  - Optional note field
  - Save button

#### 5.3 Settings Reorganization

**Current**: Inline collapsible panel
**Proposed**: Dedicated settings modal

**Settings Modal Sections:**
- **Goals**: Target weight, weekly target
- **Display**: Chart defaults, preferred units
- **AI Coach**: API key configuration
- **Data**: Export, import options

---

### 6. AI Coach Improvements

**Priority**: Medium
**Effort**: Low

#### 6.1 Preset Questions

**Requirements:**
- Show 4-6 preset question buttons above chat input
- Questions contextual to user's data:
  - "Why is my weight fluctuating?"
  - "How can I break through my plateau?"
  - "Am I on track to reach my goal?"
  - "What should I focus on this week?"
  - "Analyze my progress this month"

#### 6.2 Chat Persistence

**Requirements:**
- Save conversation history to localStorage
- Load history on component mount
- "Clear conversation" button
- Limit stored messages (last 50)

#### 6.3 Proactive Insights

**Requirements:**
- Show AI-generated insight card (without requiring chat)
- Auto-generate weekly insight based on trends
- Display in Insights tab
- Refresh button to regenerate

---

### 7. Daily Check-in Improvements

**Priority**: Medium
**Effort**: Low

#### 7.1 Prominent Placement

**Requirements:**
- Quick access from Hero section button
- Opens as modal/sheet (not buried in page)
- Shows completion status in Hero ("✓ Checked in today")

#### 7.2 Energy Level Clarity

**Current**: 1-5 scale with no labels
**Proposed**: Labeled scale with emoji indicators

```
How's your energy today?

😫        😕        😐        🙂        😄
Very Low   Low    Neutral   Good    Excellent
  1         2        3        4         5
```

#### 7.3 Quick Factors

**Requirements:**
- Show common factors as toggle chips
- Categories: Sleep, Stress, Exercise, Diet, Hydration
- Allow multiple selections
- Optional notes field

---

## Technical Considerations

### Dependencies to Add

```json
{
  "framer-motion": "^10.x",      // Animations
  "canvas-confetti": "^1.x",     // Celebration effects
  "date-fns": "existing",        // Already in use
  "recharts": "existing"         // Already in use
}
```

### State Management

- Use existing React state patterns
- localStorage for preferences:
  - `wt-tab-state`: Active tab
  - `wt-chart-preset`: Last chart view
  - `wt-collapsed-sections`: Section states
  - `wt-chat-history`: AI coach messages

### Component Structure

```
src/components/
├── dashboard/
│   ├── HeroSection.tsx         (new)
│   ├── TabContainer.tsx        (new)
│   └── CollapsibleSection.tsx  (new)
├── gamification/
│   ├── CelebrationModal.tsx    (new)
│   ├── BadgeShowcase.tsx       (new)
│   ├── StreakCalendar.tsx      (new)
│   └── QuestCard.tsx           (enhance)
├── chart/
│   ├── ChartPresets.tsx        (new)
│   ├── ChartAnnotation.tsx     (new)
│   └── ExportMenu.tsx          (new)
├── ai-coach/
│   ├── PresetQuestions.tsx     (new)
│   └── ProactiveInsight.tsx    (new)
└── ui/
    ├── FloatingActionButton.tsx (new)
    └── SettingsModal.tsx        (new)
```

---

## Implementation Phases

### Phase 1: Visual Foundation
- Color palette update (CSS variables)
- Typography hierarchy
- Card styling enhancements
- Micro-interactions (hover states, transitions)

### Phase 2: Layout Restructure
- Hero section component
- Tab-based content organization
- Collapsible sections
- Settings modal migration

### Phase 3: Gamification
- Badge showcase grid
- Streak calendar heatmap
- Celebration animations (level up, badges)
- Personalized quest generation

### Phase 4: Chart & Data
- Quick view presets
- Enhanced tooltips
- Annotation system
- Export functionality

### Phase 5: Interactions
- Floating action button
- Daily check-in modal
- AI coach improvements
- Final polish

---

## Appendix: UI Mockups

### Hero Section Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  WeightTracker                                        [⚙️]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        Current Weight                           │
│                                                                 │
│                          78.5 kg                                │
│                        ↓ 1.2 kg this week                       │
│                                                                 │
│     ████████████████████████████░░░░░░░░░░  75%                │
│     12.3 kg lost · 4.2 kg to goal (74.3 kg)                    │
│                                                                 │
│     🔥 7 Day Streak      ⭐ Level 5      💎 450/500 XP          │
│                                                                 │
│         [ ⚖️ Log Weight ]        [ ✓ Daily Check-in ]          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  🎉 NEW MILESTONE: You've lost 10 kg! Keep it up!        [×]   │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Activity ]  [ Insights ]  [ AI Coach ]  [ Gamification ]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  (Tab content renders here based on selection)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Badge Showcase Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  Badges (8/15 earned)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   🏃    │  │   🔥    │  │   ⭐    │  │   🔒    │            │
│  │Marathon │  │ On Fire │  │  Star   │  │  ???    │            │
│  │ ✓ Dec 1 │  │ ✓ Dec 10│  │ ✓ Dec 15│  │ Locked  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   💪    │  │   🎯    │  │   🔒    │  │   🔒    │            │
│  │ Strong  │  │  Goals  │  │  ???    │  │  ???    │            │
│  │ ✓ Nov 20│  │ ✓ Dec 5 │  │ Locked  │  │ Locked  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

**Completed**: 2025-12-17

### Summary

| Feature | Status | Notes |
|---------|--------|-------|
| 1.1 Hero Section | ✅ Implemented | Large weight display, progress bar, gamification stats |
| 1.2 Section Reorganization | ✅ Implemented | 4-tab layout: Activity, Insights, AI Coach, Progress |
| 1.3 Collapsible Sections | ⏭️ Skipped | Tab-based organization provides better UX |
| 2.1 Color Palette | ✅ Implemented | Semantic colors for weight, gamification |
| 2.2 Card Styling | ✅ Implemented | Gradient backgrounds, colored borders |
| 2.3 Typography | ✅ Implemented | Large hero weight (48px+) |
| 2.4 Micro-interactions | ✅ Implemented | Framer Motion animations |
| 3.1 Celebration Animations | ✅ Implemented | Confetti on achievements |
| 3.2 Badge Showcase | ✅ Implemented | Visual grid with earned/locked states |
| 3.3 Streak Calendar | ✅ Implemented | 35-day heatmap |
| 3.4 Personalized Quests | ✅ Enhanced | Dynamic streak-based quests added |
| 4.1 Enhanced Tooltips | ✅ Implemented | Workout count, weight change, energy, notes |
| 4.2 Quick View Presets | ✅ Implemented | Named presets (This Week/Month/etc.) |
| 4.3 Annotations | ⏭️ Skipped | Notes shown in tooltips; click-to-add complex |
| 4.4 Export Options | ✅ Implemented | CSV and PNG export |
| 5.1 Tab-Based Navigation | ✅ Implemented | localStorage persistence |
| 5.2 Floating Action Button | ⏭️ Removed | All data from Apple Health (no manual entry) |
| 5.3 Settings Modal | ✅ Implemented | Goal weight, API key, data export |
| 6.1 Preset Questions | ✅ Implemented | 6 preset question buttons |
| 6.2 Chat Persistence | ✅ Implemented | localStorage (last 50 messages) |
| 6.3 Proactive Insights | ✅ Modified | Manual "Generate" button instead of auto |
| 7.1 Daily Check-in Modal | ✅ Implemented | Prominent placement in Hero |
| 7.2 Emoji Energy Scale | ✅ Implemented | 5-level emoji scale |
| 7.3 Quick Factors | ✅ Implemented | 8 toggle chips |

### Deviations from Original Plan

1. **Manual Weight Logging Removed**: User indicated all data comes from Apple Health - removed FAB and "Log Weight" button
2. **Collapsible Sections Skipped**: Tab-based organization achieves the same goal more cleanly
3. **Chart Annotations Simplified**: Notes displayed in tooltips rather than full click-to-annotate system
4. **Proactive Insights Modified**: Manual "Generate" button to avoid unexpected API costs

### Files Created/Modified

**New Components:**
- `src/components/dashboard/hero-section.tsx`
- `src/components/dashboard/tab-container.tsx`
- `src/components/dashboard/settings-modal.tsx`
- `src/components/dashboard/daily-checkin-modal.tsx`
- `src/components/gamification/celebration-modal.tsx`
- `src/components/gamification/badge-showcase.tsx`
- `src/components/gamification/streak-calendar.tsx`
- `src/components/ai-coach/ai-coach-panel.tsx`
- `src/components/ui/tabs.tsx`

**Modified:**
- `src/app/page.tsx` - Complete restructure
- `src/app/globals.css` - Semantic color variables
- `tailwind.config.ts` - Extended color palette
- `src/components/weight-activity-chart.tsx` - Enhanced tooltips, export
- `src/lib/gamification.ts` - Dynamic quest generation

### E2E Test Results

**Date**: 2025-12-17
**Tool**: Playwright

| Test Case | Result | Details |
|-----------|--------|---------|
| Hero Section | ✅ Pass | Current weight, weekly change, progress bar visible |
| Log Weight Removed | ✅ Pass | Only "Daily Check-in" button shown (no manual entry) |
| Tab Navigation | ✅ Pass | Activity, Insights, AI Coach, Progress tabs working |
| Weekly AI Insight | ✅ Pass | Generate button present in Insights tab |
| Enhanced Tooltips | ✅ Pass | Shows date, weight, steps, workouts (3), walking (3.7 km) |
| Streak Calendar | ✅ Pass | Current: 3, Best: 49, today highlighted with blue border |
| Level/XP System | ✅ Pass | Level 25, 2436 XP total, 36/100 XP to next level |
| Dynamic Quests | ✅ Pass | "Reach 7-Day Streak" quest shows 3/7 progress (+50 XP) |

**Screenshots saved to**: `Playwright/` (gitignored)

---

**Document Status**: ✅ Implemented & Tested
**Completion Date**: 2025-12-17
