---
name: review
description: >
  Multi-model code review with priority triage. Runs Claude + Gemini CLI + Codex CLI
  in parallel, then merges and deduplicates findings. Falls back to Claude-only if
  external CLIs are unavailable. Findings triaged as P1/P2/P3 with disagreement
  highlighting. Use after implementing a feature, before committing, or when user
  says "review this", "check my code", "is this ready?".
  Do NOT use for pre-deploy validation (use quality-gate agent instead).
effort: high
allowed-tools: Read, Glob, Grep, Bash, Agent, TodoWrite
metadata:
  version: "4.0.0"
  author: emmanuel
---

# Review — Multi-Agent Code Review with Priority Triage

Systematic review of code changes using parallel specialized agents, multi-perspective analysis, and priority-based finding triage.

## When to Use This Skill

Activate when:
- User says "review", "check this", "is this ready", "look over my changes"
- After implementing a feature (before commit)
- Before creating a PR
- User asks "did I miss anything?"
- After significant refactoring

## How This Differs from Quality Gate

| This Skill (`/review`) | Quality Gate Agent |
|------------------------|-------------------|
| Reviews **code quality and design** | Runs **automated checks** (build, tests, types) |
| Examines logic, patterns, architecture | Validates compilation, test pass/fail |
| Finds subtle issues machines miss | Catches objective pass/fail issues |
| Run during development | Run before deploy |
| Priority triage (P1/P2/P3) | Binary pass/fail |

Use both. `/review` first (fix design issues), then quality-gate (verify everything compiles and passes).

## IMMEDIATE ACTION

### Step 0: Load Project Context

Check for project-specific review rules by reading `.claude/brand.json`:

```bash
cat .claude/brand.json 2>/dev/null || echo "NO_BRAND_CONFIG"
```

If found, use the `review_checks` section to augment the standard agents with project-specific checks. If not found, use only the universal checks below.

### Step 1: Identify What Changed

```bash
# All uncommitted changes
git diff --name-only
git diff --cached --name-only

# Changes on this branch vs main
git diff main...HEAD --name-only

# Recent commits
git log main...HEAD --oneline
```

Read every changed file. You cannot review code you haven't read.

### Step 1.5: Pre-Flight -- Check External CLI Availability

Before launching external models, check what is available:

```bash
GEMINI_AVAILABLE=false
if which gemini >/dev/null 2>&1; then
  GEMINI_AVAILABLE=true
fi

CODEX_AVAILABLE=false
if which codex >/dev/null 2>&1; then
  if codex --help >/dev/null 2>&1; then
    CODEX_AVAILABLE=true
  fi
fi
```

Record available models for the report header:

| Scenario | Models Used |
|----------|------------|
| Both CLIs available | Claude + Gemini + Codex (full 3-model review) |
| Only Gemini available | Claude + Gemini (2-model review) |
| Only Codex available | Claude + Codex (2-model review) |
| Neither available | Claude only (single-model fallback) |

**Never fail the review because an external CLI is unavailable.** Degrade gracefully and note which models participated in the report.

### Step 1.6: Context Budget Check

Before launching parallel review agents, assess context pressure:
- If context is above 80% used, reduce to **2 agents only** (Security + Quality) instead of all 5. Combine architecture, performance, and a11y checks into a single-pass synthesis in Step 3.
- If context is below 80%, proceed with full parallel review.

This prevents compaction mid-review, which would lose the diff context needed for accurate findings.

### Step 2: Launch Claude Review Agents

Launch these as parallel Agent subagents with `subagent_type: Explore`. Each examines the changed files through a specific lens.

#### Agent 1: Security Reviewer

Examine all changed files for:

- **Injection risks:** SQL injection, XSS, command injection, path traversal
- **Auth/authz gaps:** Missing auth checks, bypassed access control, exposed admin routes
- **Secret exposure:** Hardcoded keys, tokens in client code, leaked env vars
- **Input validation:** Unsanitized user input, missing type coercion, unchecked request bodies
- **CSRF/CORS:** Missing or misconfigured protections on API routes
- **Prototype pollution:** Merging untrusted objects with `for...in`
- **ReDoS:** Nested quantifiers in regex causing exponential backtracking
- **Type coercion:** Using `==` instead of `===` on user input
- **Sensitive data in logs:** PII or secrets in `console.log/error` output
- **Error message leakage:** Stack traces or internal details returned to the client

**Plus any project-specific security checks from `brand.json → review_checks.security`.**

#### Agent 2: Architecture Reviewer

Examine for:

- **Pattern consistency:** Does new code follow existing codebase patterns?
- **Separation of concerns:** Business logic in the right layer?
- **DRY violations:** Duplicated logic that should be shared?
- **Coupling:** Tight coupling where loose coupling is better?
- **Import structure:** Following project conventions?

**Plus any project-specific architecture checks from `brand.json → review_checks.architecture`.**

#### Agent 3: Code Quality Reviewer

Examine for:

- **Error handling:** Errors caught, logged, returned with proper status codes?
- **Edge cases:** Null/undefined, empty arrays, missing data
- **Naming:** Clear, consistent variable and function names
- **Complexity:** Functions doing too many things, deep nesting
- **Dead code:** Unused imports, unreachable branches, commented-out code

#### Agent 4: Performance Reviewer

Examine for:

- **N+1 queries:** Database queries in loops
- **Missing indexes:** New WHERE/JOIN columns without corresponding indexes
- **Bundle size:** Large imports that could be dynamic
- **Re-renders:** Missing memoization where needed
- **API response size:** Returning more data than needed

**Plus any project-specific performance checks from `brand.json → review_checks.performance`.**

#### Agent 5: Accessibility & i18n Reviewer

Examine for:

- **a11y:** Missing aria labels, inaccessible elements, missing alt text
- **i18n:** Hardcoded strings that should use translation utilities
- **Locale handling:** All configured locales handled?

**Plus any project-specific a11y/i18n checks from `brand.json → review_checks.a11y`.**

### Step 2.5: Launch External Model Reviews (in parallel with Step 2)

Run Gemini and Codex reviews **simultaneously** with the Claude agents above. Use `run_in_background: true` for each Bash call.

#### Gemini CLI Review

If `GEMINI_AVAILABLE` is true, pipe the diff to Gemini with a structured review prompt requesting the FINDING format (SEVERITY, CATEGORY, FILE, TITLE, ISSUE, FIX). Save output to `/tmp/gemini-review.txt`.

```bash
echo "$GEMINI_PROMPT" | gemini -p - > /tmp/gemini-review.txt 2>&1
```

The prompt should instruct Gemini to output each finding in this format:

```
FINDING:
- SEVERITY: P1|P2|P3
- CATEGORY: security|logic|performance|architecture|a11y
- FILE: path/to/file.ext:line_number
- TITLE: short description
- ISSUE: what is wrong and why it matters
- FIX: specific suggestion to fix it
```

If no issues found, output: `NO_FINDINGS`

#### Codex CLI Review

If `CODEX_AVAILABLE` is true, send the diff to Codex with the same FINDING format. Save output to `/tmp/codex-review.txt`.

```bash
codex exec "$CODEX_PROMPT" > /tmp/codex-review.txt 2>&1
```

### Step 3: Collect and Parse All Results

Wait for all three review streams to complete, then:

1. **Claude findings:** Collected from the 5 parallel Agent subagents (structured, already in your context)
2. **Gemini findings:** Read `/tmp/gemini-review.txt`, parse each `FINDING:` block
3. **Codex findings:** Read `/tmp/codex-review.txt`, parse each `FINDING:` block

### Step 4: Multi-Perspective Deep Dive

After the parallel agents return, conduct a synthesis analysis:

| Perspective | What to Evaluate |
|-------------|-----------------|
| **Developer** | Is this code maintainable? Would a new team member understand it? |
| **Operations** | What could go wrong in production? Logging, monitoring, error recovery? |
| **End User** | Does this work correctly? Edge cases? Loading states? Error messages? |
| **Security** | Could this be exploited? What's the blast radius if compromised? |
| **Business** | Does this deliver the intended value? Any unintended side effects? |

### Step 4: Scenario Exploration

For non-trivial changes, mentally test these scenarios:

- **Happy path:** Does the intended flow work correctly?
- **Invalid input:** What happens with bad data?
- **Boundary conditions:** Empty lists, max values, zero, negative numbers
- **Concurrent access:** Race conditions, duplicate submissions
- **Scale:** What happens with 10x the expected load?
- **Network failures:** What if an external service is down?
- **Partial failures:** What if step 2 of 3 fails?

### Step 4.5: Filter Protected Artifacts

When synthesizing findings, **automatically discard** any recommendation to delete or remove:
- `docs/plans/` — implementation plans (compound engineering output)
- `docs/solutions/` — documented solutions (institutional knowledge)
- `docs/decisions/` — decision logs
- `docs/sessions/` — session continuity logs
- `docs/sprints/` — sprint retrospectives

These are intentional compound engineering artifacts. Code simplicity and architecture reviewers sometimes flag them as "dead files" or "unnecessary docs" — filter these out before presenting findings.

### Step 5: Merge, Deduplicate, and Triage

#### 5a. Normalize Findings

Convert all findings (from Claude agents, Gemini, and Codex) into a common format:

- Source: Claude|Gemini|Codex
- Severity: P1|P2|P3
- Category: security|logic|performance|architecture|a11y|quality
- File: path/to/file.ext:line
- Title: short description

#### 5b. Deduplicate

Two findings are duplicates if they reference **the same file + same issue type** (even if worded differently). When deduplicating:
- Keep the most detailed description
- Note which models found it: `[Claude + Gemini]`, `[All 3]`, etc.
- **Agreement count matters:** findings caught by 2+ models are higher confidence

#### 5c. Flag Disagreements

Mark findings caught by only one model with `[SOLO: ModelName]`. Present a disagreement table:

```
| Finding | Claude | Gemini | Codex | Assessment |
|---------|--------|--------|-------|------------|
| SQL injection in query.ts:42 | found | found | missed | Real issue |
| Unused import in utils.ts:1 | missed | found | missed | Likely FP |
```

#### 5d. Triage Findings by Priority

| Priority | Label | Meaning | Action |
|----------|-------|---------|--------|
| **P1** | Critical | Security vulnerability, data loss, crash, breaking change | **Blocks merge.** Must fix. |
| **P2** | Important | Performance issue, architectural concern, reliability problem | Should fix before merge. |
| **P3** | Nice-to-have | Minor improvement, cleanup, style preference | Fix if practical. |

**Agreement-weighted adjustment:**
- Found by all 3 models: keep or raise priority (high confidence)
- Found by 2 models: keep priority as-is
- Found by 1 model only: lower by one level (except P1 security -- never downgrade those)

### Step 6: Present Review Report

```
## Code Review Report

### Summary
- **Models used:** Claude + Gemini + Codex (or subset)
- **Files reviewed:** N
- **Findings:** N P1, N P2, N P3 (N consensus, N solo)
- **Verdict:** APPROVE / REQUEST CHANGES / APPROVE WITH NOTES

---

### P1 — Critical (Blocks Merge)

#### [Finding Title]
- **Dimension:** Security / Architecture / Quality / Performance / A11y
- **File:** `path/to/file.ts:line`
- **Found by:** [Claude + Gemini] or [All 3] or [SOLO: Codex]
- **Issue:** What's wrong and why it matters
- **Fix:** Specific suggestion

---

### P2 — Important (Should Fix)
...

### P3 — Nice-to-Have (Optional)
...

### What Looks Good
(Acknowledge well-written code)

### Model Disagreements

| Finding | Claude | Gemini | Codex | Assessment |
|---------|--------|--------|-------|------------|
| ... | found | found | missed | Real issue |

### Consensus Findings
N findings confirmed by 2+ models (high confidence).

### Scenarios Tested
(List tested scenarios and outcomes)
```

## Review Scope Guidelines

**Small changes (1-3 files):** Review all dimensions inline, no sub-agents needed.
**Medium changes (4-10 files):** Launch 2-3 parallel review sub-agents.
**Large changes (10+ files):** Launch all 5 dimension reviews in parallel.

## Post-Review Actions

If P1 findings exist:
1. Fix each P1 finding
2. Re-run review on the fixed code
3. Repeat until no P1 findings remain

If only P2/P3 findings:
1. Fix P2 findings if practical
2. Document remaining items as follow-up tasks
3. Proceed to commit

## Integration with Other Skills

- **Before review:** Code should be implemented and type-checking should pass
- **After review:** Run quality-gate for automated validation
- **As part of `/lfg`:** This skill runs as Phase 3 of the compound loop
- **After fixing findings:** `/learn` can capture patterns from review findings

## Anti-Patterns

- **Reviewing without reading:** Never comment on code you haven't read in full.
- **Style nitpicking over substance:** P1/P2 issues matter more than formatting.
- **Missing the forest for the trees:** Check overall design, not just line-by-line.
- **Suggesting rewrites:** Review the code as written. Suggest targeted fixes.
- **Ignoring context:** A pattern that looks wrong might be intentional. Check first.
- **Reviewing unchanged code:** Focus on what changed. Pre-existing issues are out of scope.
- **Trusting a single model blindly:** Solo findings from one model may be false positives. Weight consensus higher.
- **Blocking on CLI failures:** Never fail the review because Gemini or Codex CLI is unavailable. Degrade gracefully to Claude-only.

## Troubleshooting

**No changes to review:**
- Check if changes are on a different branch.

**Too many findings:**
- Focus on P1 and P2. Mention P3 count but don't detail each unless asked.

**Disagreement with existing patterns:**
- Note as "pre-existing issue" rather than a finding. Suggest follow-up task.

**Gemini CLI not responding:**
- Verify: `which gemini`. If missing, skip Gemini and note in report.
- If installed but hanging, check API key: `gemini --version`.

**Codex CLI not responding:**
- Verify: `which codex` and `codex --help`. If either fails, skip Codex.
- Codex requires authentication. Check `codex auth status` if available.
