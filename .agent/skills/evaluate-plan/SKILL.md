---
name: evaluate-plan
description: >
  Evaluate an implementation plan against its source requirements (PRD, spec, or user request)
  to identify gaps, dropped features, and lost intent. Use when the user says "evaluate plan",
  "verify plan", "check the plan", "what did it miss", "plan coverage", or "validate plan".
effort: high
allowed-tools: Read, Glob, Grep, Bash, Agent, TodoWrite
user-invocable: true
metadata:
  version: "1.1.0"
  author: emmanuel
  argument-hint: <path-to-source-document>
---

# Evaluate Plan

Systematically verify that an AI-generated implementation plan fully covers its source requirements.

**Context**: First-pass plans silently drop ~20-40% of explicit requirements. A structured coverage
check recovers most gaps. This skill forces a coverage-first second pass.

## Phase 1: Identify the Source of Truth

Locate the document(s) the plan was built from:

- A PRD, spec, feature brief, or user story set
- An intent document or voice transcript
- The original user request in this conversation
- A file path provided as argument (e.g., `evaluate plan against @prd.md`)

If multiple sources exist, treat them as a combined requirement set.

**If no explicit document exists**: reconstruct the requirement set from the user's messages
in the current conversation. Quote the original requests.

> **Rule**: The source document is the authority. If something is in the source but not the
> plan, it is a gap — regardless of whether the plan's approach seems reasonable without it.

## Phase 2: Extract Requirements Inventory

Read the source and extract every discrete requirement into a flat checklist:

| Category | What to Extract |
|----------|----------------|
| **Functional features** | Every capability, behavior, or feature described |
| **Interaction behaviors** | Click, hover, drag, dismiss, keyboard, gesture behaviors |
| **UX / emotional intent** | How it should *feel*, experience goals, tone |
| **Visual requirements** | Layout, styling, animations, responsive behaviors |
| **Data & state** | What data is shown, stored, transformed, persisted |
| **Error & edge cases** | Empty states, fallbacks, timeouts, validation |
| **Integration points** | APIs, external services, auth, notifications |
| **Non-functional** | Performance targets, accessibility, platform support |
| **"Why" context** | Rationale or motivation — intent behind features |

**Extraction rules:**
- One requirement per line — do not bundle related items
- Preserve original language where possible
- Feelings and experiences are requirements
- Implicit requirements count (e.g., "like Spotlight" implies global hotkey, float-above, escape-to-dismiss)
- Do not merge for convenience — "user management" is not one requirement; break it into registration, login, password reset, roles, etc.

## Phase 3: Evaluate Coverage

For each requirement, search the plan and assign a status:

| Status | Meaning | Criteria |
|--------|---------|----------|
| ✅ Covered | Explicitly addressed | Plan describes how this will be implemented |
| 🟡 Partial | Mentioned but incomplete | Plan references it but lacks specifics or only covers part |
| ❌ Missing | Not in the plan | No mention, no inference, completely absent |
| ⚠️ Misinterpreted | Present but wrong | Plan addresses something that doesn't match source intent |

## Phase 4: Coverage Report

### 4a. Summary

```
COVERAGE REPORT
===============
Source: [document name(s) or "conversation context"]
Plan:   [plan name or "current plan in conversation"]
Total requirements: [N]

  ✅ Covered:         [n] ([%])
  🟡 Partial:         [n] ([%])
  ❌ Missing:          [n] ([%])
  ⚠️ Misinterpreted:   [n] ([%])

Coverage Score: [X]%
```

**Score formula**: `(Covered + 0.5 * Partial) / Total * 100`
Misinterpreted items count as 0 (same as Missing).

### 4b. Missing & Misinterpreted Items (sorted by impact)

```
❌ [Requirement summary]
   Source: "[exact quote from source]"
   Impact: High / Medium / Low
   Why it matters: [one sentence]
```

### 4c. Partial Coverage Items

```
🟡 [Requirement summary]
   Covered: [what the plan addresses]
   Gap:     [what's left out]
```

### 4d. Top Gaps (prioritized shortlist)

List the **5-10 highest-impact gaps** most likely to produce a noticeably incomplete build.

## Phase 5: Replan

After presenting the report:

1. **If coverage >= 95%**: Report the score. Note any remaining gaps as "acknowledged ambiguities."
   Ask if the user wants them addressed.
2. **If coverage < 95%**: Ask "Should I update the plan to address these gaps?"
3. When replanning:
   - Integrate missing items into the existing plan structure (not as an appendix)
   - Preserve everything already covered
   - Add specific implementation notes for previously missing items
   - Flag genuinely ambiguous items that need user clarification

## Phase 6: Re-evaluate

After patching the plan, run Phases 2-4 again on the updated plan.

| Pass | Expected Coverage | What Gets Found |
|------|-------------------|-----------------|
| Plan (no evaluation) | ~60-80% | -- |
| After 1st evaluation + replan | ~90-95% | Core features, interaction behaviors, UX details |
| After 2nd evaluation + replan | ~95-100% | Subtle intent, edge cases, ambiguous specs |

**Stop when**: coverage >= 95% OR remaining gaps are items the user acknowledges as intentionally unspecified.

## Anti-Patterns

- **Do not accept the plan's framing as truth** — the plan may restructure requirements in a way
  that *sounds* complete but drops items. Always check against the source.
- **Do not skip implicit requirements** — "like Spotlight" implies dozens of behaviors. Extract them.
- **Do not merge requirements for convenience** — break them down to atomic items.
- **Do not treat "why" as optional** — intent and rationale are requirements. If the plan drops
  the *why*, that is a gap.
- **Do not stop after one pass** — always offer re-evaluation after replanning.
