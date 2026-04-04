---
name: lfg
description: >
  Full compound engineering loop — plan, work, assess, compound — in one
  invocation. Use when starting a feature from scratch and you want the full
  workflow: research, plan, implement with tests, review, and capture learnings.
  Trigger phrases: "lfg", "let's go", "build this end to end", "full workflow".
  Do NOT use for quick fixes, questions, or tasks that are already mid-flight.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion, TodoWrite, Skill
metadata:
  version: "2.0.0"
  author: emmanuel
---

# LFG — Full Compound Engineering Loop

One command to go from zero to production-ready: plan, work, assess, compound.

Each cycle compounds: plans inform future plans, reviews catch more issues, solutions get documented. Each unit of engineering work makes the next one easier.

## When to Use This Skill

Activate when:
- User says "lfg", "let's go", "build this end to end"
- User wants the full workflow for a new feature
- Starting a greenfield feature from scratch
- User says "do the whole thing", "full workflow"

Do NOT use when:
- Task is a quick fix (< 3 files)
- Already mid-implementation (use individual skills instead)
- User just wants a plan or just wants a review

## The Compound Loop

```
  PLAN ──→ WORK ──→ ASSESS ──→ COMPOUND
   │                               │
   └───────────────────────────────┘
         (learnings feed back)
```

## IMMEDIATE ACTION

Run these phases in order. Do not skip phases.

### Phase 1: PLAN

Invoke the `/plan` skill:

```
Skill: plan
Args: "[description of what the user wants to build]"
```

This will:
1. Check for existing plans and past solutions
2. Run parallel research (codebase exploration + `/brief` + learnings search)
3. Ask clarifying questions
4. Choose appropriate detail level
5. Produce a structured plan in `docs/plans/`
6. Wait for user approval

**GATE: Do NOT proceed to Phase 2 until the user approves the plan.**

### Phase 2: WORK

Once the plan is approved, implement it:

#### Step 1: Set Up Task Tracking
Create a TodoWrite list from the approved plan steps.

#### Step 2: Implement Incrementally
For each step in the plan:
1. Mark the step as `in_progress`
2. Implement the change
3. Run relevant checks (type-check, tests) after each logical unit
4. Run the **System-Wide Test Check** (see below)
5. Mark the step as `completed`
6. Commit the step with a clear message

#### System-Wide Test Check (before marking any task done)

Ask these 5 questions for every non-trivial change:

1. **What fires when this runs?** — Trace callbacks, middleware, observers, webhooks two levels out
2. **Do tests exercise the real chain?** — Integration tests with real objects, not just mocked units
3. **Can failure leave orphaned state?** — Verify cleanup/idempotence on error paths
4. **What other interfaces expose this?** — Check API, CLI, agent tools for parity
5. **Do error strategies align?** — No conflicting retry/rollback across layers

If any answer is "I don't know", investigate before proceeding.

#### Step 3: Write Tests
For every new function, API route, or component:
- Unit tests for business logic (Vitest)
- Check if E2E tests are needed for user-facing flows (Playwright)
- Follow existing test patterns in the codebase

#### Step 4: Verify

```bash
npm run type-check && npm run test:run && npm run build
```

**GATE: All three must pass before moving to Phase 3.**

If any fail:
1. Fix the failure
2. Re-run the failing check
3. Continue fixing until all pass
4. Do NOT move to Phase 3 with broken code

#### Step 5: Operational Validation Plan

For any change that touches production code, draft a `## Post-Deploy Monitoring` section (for the PR description or plan doc):

- **Log queries**: What to search for in logs to verify the change works
- **Metrics/dashboards**: Which metrics should move (and which should NOT)
- **Expected signals**: What "working correctly" looks like in the first hour
- **Failure triggers**: What would indicate a rollback is needed
- **Validation window**: How long to monitor before considering the deploy stable

**REQUIRED** for production-touching changes. Skip only for pure refactors or test-only changes.

### Phase 3: ASSESS

**Before invoking review:** Re-read the original task description or issue from Phase 1. Compare the final output against what was actually asked — not against your own implementation. Verify the scope matches: no more, no less. If there's drift, fix it before review.

Invoke the `/review` skill:

```
Skill: review
```

This will:
1. Identify all changed files
2. Launch parallel review agents (security, architecture, quality, performance, a11y/i18n)
3. Conduct multi-perspective analysis
4. Test scenarios (happy path, edge cases, failures)
5. Triage findings as P1/P2/P3

**If P1 (Critical) findings exist:**
1. Fix each P1 finding
2. Re-verify (type-check + tests + build)
3. Re-run review on the fixed code
4. Repeat until no P1 findings remain

**If P2 (Important) findings exist:**
1. Fix what's practical within current scope
2. Document remaining P2 items as follow-up tasks

**If only P3 (Nice-to-have) findings:**
- Fix any quick wins
- Note the rest for future improvement

### Phase 4: COMPOUND

Invoke the `/learn` skill:

```
Skill: learn
```

This will:
1. Review what happened during this implementation
2. Extract patterns, decisions, and mistakes
3. Document solutions in `docs/solutions/` if a non-trivial problem was solved
4. Update `docs/decisions/log.md` with architectural decisions
5. Suggest CLAUDE.md updates if recurring patterns emerged

**This phase is NOT optional.** The compound step is what makes the system improve over time. Skipping it means repeating the same mistakes.

## Phase Dependencies

```
Phase 1 (PLAN)
  ├─ gate: user approval
  │
  Phase 2 (WORK)
  │  ├─ gate: type-check PASS
  │  ├─ gate: tests PASS
  │  ├─ gate: build PASS
  │  │
  │  Phase 3 (ASSESS)
  │  │  ├─ gate: no P1 findings (or all fixed)
  │  │  │
  │  │  Phase 4 (COMPOUND)
  │  │     └─ outputs: docs/solutions/, docs/decisions/log.md, docs/sessions/log.md
```

## Handling Interruptions

**User wants to skip a phase:**
- Advise against it, especially for Phase 4 (compound)
- If they insist, respect the decision and log: "Phase N skipped at user request"

**Build/tests fail in Phase 2:**
- Fix the failures before proceeding. Don't move to review with broken code.

**Review finds fundamental design issues (Phase 3):**
- If the issue requires rethinking the approach, go back to Phase 1 (re-plan)
- If it's a targeted fix, stay in Phase 3 (fix and re-review)

**Session ends mid-loop:**
- Use `/cp` to commit current state with a session log
- Next session: check `docs/plans/` and `docs/sessions/log.md` to pick up where you left off

## Example Flow

```
User: "lfg — add PDF export for voice profiles"

Phase 1 (PLAN):
  → /brief surfaces: existing export patterns, brand constraints
  → Explores: voice profile data, similar export code, PDF libs
  → Asks: "Full profile or summary? Match dashboard layout?"
  → Plan created: docs/plans/2026-02-15-feat-pdf-export-plan.md
  → User approves

Phase 2 (WORK):
  → Step 1: Add PDF generation utility (lib/export-pdf.ts)
  → Step 2: Create API route (app/api/export-pdf/route.ts)
  → Step 3: Add export button to dashboard
  → Step 4: Write tests
  → type-check: PASS, tests: PASS, build: PASS

Phase 3 (ASSESS):
  → Security: PASS (auth check, no injection)
  → Architecture: P3 (could extract PDF template)
  → Quality: PASS
  → Performance: P3 (async for large profiles)
  → a11y: PASS (button has aria-label)
  → Verdict: APPROVE WITH NOTES

Phase 4 (COMPOUND):
  → Solution documented: docs/solutions/feat/pdf-export-pattern.md
  → Decision logged: "Used @react-pdf/renderer over puppeteer for SSR compat"
  → Session logged in docs/sessions/log.md
```

## Anti-Patterns

- **Rushing through phases:** Each phase exists for a reason. Don't compress the loop.
- **Skipping compound:** "We're done, ship it" accumulates technical debt. Always capture learnings.
- **Over-engineering Phase 1:** Match plan complexity to task complexity.
- **Ignoring review findings:** If the review finds issues, fix them.
- **Not gating between phases:** Each gate prevents cascading problems. Don't bypass them.
