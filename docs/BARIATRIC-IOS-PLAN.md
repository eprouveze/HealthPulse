# SleeveCoach — iOS App Product & Business Plan

> Working title. A bariatric-focused iPhone app built on the HealthPulse foundation, specifically for sleeve gastrectomy patients from pre-op through the five-year rebound window.

## 1. Positioning

**One-liner**: The AI coach for sleeve patients — from week one through the five-year rebound.

**Why this niche wins**:
- Hospitals discharge patients with a binder and disappear. There is no continuous support layer.
- Pricing power is high: patients paid $15–25k for surgery; $10/mo for lifetime coaching is trivial.
- The dominant app (Baritastic) is dated, cluttered, has no AI, and no longitudinal intelligence.
- Authentic founder credibility cannot be faked — bariatric communities are tight and skeptical of outsiders.
- Apple Health captures nearly every signal that matters: weight, body composition, steps, heart rate, sleep.

**Target segments in priority order**:
1. **3–12 months post-op** — honeymoon ending, first plateaus, protein struggles, highest engagement
2. **12–36 months post-op** — rebound risk zone, hardest retention problem in the category
3. **Pre-op (last 1–3 months)** — funnel into post-op retention, low CAC via content
4. **3+ years post-op, regain active** — smallest but deepest pain, hardest to reach

## 2. Product Spec

### Features that carry over from HealthPulse (mostly unchanged)
- **Weight tracking + custom chart** — the shareable artifact. Core asset.
- **AI Coach** — foundation stays, prompt context is recut for bariatric domain.
- **Daily check-ins** — notes, energy, mood.
- **Body composition** — critical for bariatric (muscle preservation tracking).
- **Sleep / HRV / resting HR** — stress and recovery markers post-op.
- **HealthKit integration** — the whole reason for the iOS port; replaces XML import.

### Features that get recut
- **Gamification → phase-based milestones**
  - Liquid → puree → soft → solid diet progression (post-op weeks 0–8)
  - First walk, first stairs, first gym visit
  - 3mo / 6mo / 1yr / 2yr / 5yr anniversaries
  - Protein target streaks, hydration streaks
  - "Stall broken" badges
- **AI Coach prompts → bariatric-aware system prompt**
  - Knows protein targets (60–100g/day), hydration minimums (64oz+), vitamin protocol
  - Aware of dumping syndrome, stalls, head hunger vs real hunger, pouch rules
  - Flags deficiency risk patterns (fatigue + low protein = B12/iron investigation)
  - Gentler tone than generic fitness coaching — no calorie shaming
- **Nutrition sprints → protein focus weeks / hydration challenges / stall breakers**
  - Reframed around bariatric priorities, not general calorie deficit

### Net-new features (required for category credibility)
- **Pre-op prep mode** — liquid diet countdown, surgery checklist, hospital bag list
- **Phase-based food guidance** — what to eat/avoid by post-op week, portion size targets
- **Vitamin & supplement tracker** — multivitamin, B12, calcium citrate, iron, D3 with reminders. Critical: non-compliance causes long-term deficiencies that derail outcomes.
- **Dumping syndrome log** — trigger foods, time since eating, symptom severity. Pattern detection over time.
- **Progress photos** — monthly with comparison slider, privacy-preserving (on-device only unless shared)
- **Bariatric-specific metrics**
  - %EWL (excess weight loss)
  - %TWL (total weight loss)
  - BMI trajectory vs. expected surgical curve
- **Rebound risk monitor (year 2+)** — detects slow weight uptick, behavior drift, flags coach to intervene before the drift becomes regain
- **Doctor export** — PDF summary for post-op follow-up appointments

### Explicitly out of scope for v1
- Community / social feed — moderation cost too high, legal surface area too big
- Recipes / meal planning — saturated, not a differentiator
- Apple Watch app — v2
- Other surgeries (RNY, DS, band) — start narrow, expand later
- Direct surgeon partnerships — v2 after product-market fit

## 3. Business Model

### Pricing
- **Free tier**: HealthKit sync, weight chart, basic gamification, shareable progress card, vitamin reminders
- **Pro ($9.99/mo or $79/yr)**: AI Coach, phase-based guidance, unlimited nutrition sprints, dumping log with pattern detection, rebound monitor, doctor export
- **Lifetime ($199)**: Early-adopter tier for first 100 buyers. Capital upfront + commitment signal + community seed.

### Unit economics
- Claude Sonnet 4.6 at ~10 coach queries/mo: ~$0.30/user/month in AI cost
- Apple takes 15–30% (15% for subs >1yr or via small business program)
- At $9.99 monthly: ~$8.00 net, ~$7.70 gross margin after AI costs → **~77% gross margin**
- At $79 annual: ~$67 net, $63 gross margin → effectively 80%+ margin
- Break-even on $99 dev account: **1 annual subscriber**

### Revenue milestones
| Milestone | Paying users | ARR | Timeline target |
|---|---|---|---|
| Dev account covered | 2 | ~$150 | Month 6 |
| Infra + tools covered | 20 | ~$1.5k | Month 9 |
| Coffee budget | 100 | ~$7.5k | Month 12 |
| Part-time sustainable | 500 | ~$40k | Year 2 |
| Full-time viable | 2,000 | ~$160k | Year 3 |

2,000 paying users is ~1% of annual US sleeve volume alone. Not aggressive for a category-dominant app.

## 3b. Secondary Revenue: Hardware Affiliates

A smart scale that syncs with HealthKit is effectively a requirement for getting good body-composition data. Bariatric patients are *highly* motivated to track this — they're watching lean mass preservation, not just scale weight. This is a natural, non-sleazy affiliate opportunity.

### Scales worth recommending
| Scale | Typical price | HealthKit sync | Body comp metrics | Affiliate program |
|---|---|---|---|---|
| Masaru Fitness | ~$60 | Yes (seamless, founder-tested) | Full (body fat %, lean mass, water, bone) | Check direct; Amazon Associates as fallback |
| Withings Body Smart / Body Scan | $100–400 | Yes | Full, medical-grade on Body Scan | Direct program, ~10% |
| Eufy Smart Scale P3 | ~$70 | Yes | Full | Amazon Associates only |
| Renpho Elis | ~$30 | Yes | Full | Direct + Amazon |
| QardioBase | ~$150 | Yes | Full + pregnancy mode | Direct program |

### How to integrate
- **In-app "Your scale" setup flow** on first launch: detect existing HealthKit body-comp data sources; if none, show a short educational screen on why a smart scale matters post-op, with 2–3 recommended options at different price points
- **Honest recommendations, tagged as affiliate** — don't hide it; bariatric communities sniff out inauthentic pitches instantly
- **One primary recommendation** (Masaru if the affiliate math works, since you actually use it) plus a budget option (Renpho) and a premium option (Withings Body Scan)
- **Revisit later**: year-2+ users who start showing rebound signals get a gentle prompt if their scale is basic — upgrade to medical-grade could sharpen the signal

### Revenue expectations
- Conservative: 1 in 10 Pro users buys a scale through the link = ~$5–15 commission at ~10% rate
- At 500 Pro users, ~50 scale sales/year = $500–750 incremental ARR. Not transformative but pays for hosting.
- Real value is **onboarding quality**: users with smart scales have 3–5x better tracking retention, which improves your core sub metrics.

### What NOT to do
- Don't take money to rank a worse scale higher — kills trust immediately
- Don't bundle a scale with the subscription (logistics nightmare, returns, cross-border shipping)
- Don't become a scale reseller — stay software, point at Amazon/manufacturer

## 4. Go-to-Market

### Content marketing (primary channel)
Bariatric SEO is under-served. Long-form posts on:
- "Why am I stalling at week 3?" (every patient Googles this)
- "Post-op hair loss: what's normal and when it stops"
- "Dumping syndrome trigger foods: a pattern-based approach"
- "The 2-year rebound: what the data actually shows"
- "Vitamin protocol: what your surgeon didn't explain clearly"

Each post ends with: *"We built the app we wish we'd had post-op."*

### Community presence (secondary)
- **Reddit**: r/gastricsleeve (80k+), r/BariatricSurgery (40k+) — genuine participation, answer questions, never spam. Build reputation over 3–6 months before any mention of the app.
- **TikTok/Instagram**: bariatric creator community is large and engaged. #bariatricjourney, #wlsjourney, #vsgjourney. Document your own journey authentically; the app is the artifact.
- **Facebook groups**: older demographic but huge engaged bariatric groups. Slower to penetrate.

### Creator partnerships (month 9+)
Established bariatric YouTubers/TikTokers have loyal audiences. Offer lifetime Pro + revenue share for honest reviews. Budget: 5 creators at $500 each = $2.5k for ~50k qualified impressions.

### What I am NOT doing
- Paid ads — bariatric keywords are expensive and the audience trusts peers, not ads
- Surgeon/clinic partnerships in v1 — long sales cycle, distracts from consumer pull
- Press — bariatric isn't a tech-press story

## 5. Roadmap

### Months 1–3: MVP build
- SwiftUI app with HealthKit read permissions for all HealthPulse-tracked types
- Port AI Coach with bariatric-recut system prompt
- Weight chart + shareable image export
- Vitamin tracker with local notifications
- Basic gamification (phase milestones)
- TestFlight with 10 beta users recruited from Reddit

### Month 4: App Store launch (free tier only)
- Free forever for weight tracking + chart + vitamin reminders
- Gather 100+ users, measure retention, validate AI coach quality
- Write 10 seed blog posts for SEO

### Month 6: Pro tier launch
- Turn on subscription, grandfather beta users with lifetime Pro
- Launch lifetime $199 tier, cap at 100 buyers
- Begin active Reddit/TikTok presence

### Month 9: Creator partnerships + rebound features
- Ship rebound risk monitor (the year-2+ differentiator)
- 5 creator partnerships
- First retention cohort analysis

### Month 12: Review and decide
- If 100+ paying users and healthy retention → double down, consider Apple Watch app, expand to RNY
- If under 50 paying users → keep as personal tool, don't renew creator partnerships
- Honest kill criteria, not perpetual hopium

## 6. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Medical adjacency / liability | High | Clear "not medical advice" disclaimers, never diagnose, never recommend supplement doses, always defer to surgeon/dietitian |
| Eating disorder triggers | High | No calorie-shaming language, no aggressive weight-loss gamification, opt-in calorie displays, resource links to ED support |
| Apple review scrutiny on health claims | Medium | Conservative copy, no "lose weight" claims, position as tracking + reflection |
| Founder burnout (solo) | Medium | Monthly cadence matches your actual usage; don't over-promise support response times |
| Public journey as marketing has privacy cost | Medium | Decide upfront what's shareable; accept that authenticity requires some exposure |
| AI model costs spike | Low | Haiku fallback for routine nudges; Sonnet only for weekly deep-dives |
| Category incumbents copy | Low | Baritastic has had 10 years; they won't move fast |

## 7. Moat Over Time

- **Year 1**: Authentic voice, SEO content library
- **Year 2**: Longitudinal data — you'll know which patterns predict rebound better than anyone
- **Year 3**: Community trust + data-backed coaching that generic fitness apps can't match
- **Year 5**: Category-defining brand; potential acquisition target for bariatric clinic networks or Ro/Hims-type telehealth players

## 8. Decision Gates

**Before month 1 (build start)**:
- Commit to 12-month timeline minimum
- Accept $99 dev account + App Store 15% + ~$500 infra/year as cost of experiment
- Write personal kill criteria (what would make me stop?)

**Before month 6 (Pro launch)**:
- Do I still use it? (If I stopped, nobody else will start)
- Do the 10 beta users reach for it weekly?
- Is the AI coach actually adding value or just reflecting data back?

**Before month 12 (double down / wind down)**:
- 100+ paying users with >60% 3-month retention = double down
- Anything less = keep personal, don't renew partnerships

---

## Appendix: What carries over from HealthPulse codebase

Reusable (with porting effort):
- AI Coach system prompt (`src/app/api/coach/route.ts`) — rewrite for bariatric context but structure holds
- Analysis logic (`src/lib/analysis.ts`) — trend detection, milestone logic
- Data model shapes — tables map to Swift `Codable` structs
- Gamification rules — XP, streaks, badges (retheme to bariatric)
- Nutrition sprint logic — protein/hydration tracking math
- Charting aesthetic — port from Recharts to Swift Charts with same visual language

Discarded:
- Next.js API routes (move AI calls into the app or a minimal backend)
- SQLite schema directly (use GRDB or SwiftData)
- XML import pipeline (replaced by HealthKit)
- Web UI components (full SwiftUI rewrite)
