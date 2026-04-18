# SleeveCoach

An iOS companion app for sleeve gastrectomy patients — from pre-op through the five-year rebound window. HealthKit-native, AI-coached, privacy-first.

> Working title. Final name TBD before App Store submission.

## Status

Pre-development. See `docs/PRD.md` for the full product spec and `docs/BUSINESS-PLAN.md` for strategy.

## Stack (planned)

- **SwiftUI** — iOS 17+ target
- **HealthKit** — read-only access for weight, body composition, activity, sleep, heart rate
- **GRDB** or **SwiftData** — local persistence
- **Anthropic Swift SDK** — AI coaching (Claude Sonnet 4.6 default, Haiku 4.5 fallback)
- **StoreKit 2** — subscription management
- **Swift Charts** — visualization

## Origin

Forked conceptually (not code) from [HealthPulse](../HealthPulse) — a personal Mac web dashboard. The AI coaching prompts, analysis logic, and gamification rules port over; the UI, persistence, and data import are rebuilt for native iOS + HealthKit.

## License

TBD. Not open source at this time.
