---
name: plan
description: >
  Research-first planning for any task. Spawns parallel sub-agents to explore
  the codebase, checks past solutions, asks clarifying questions, then produces
  a structured plan stored in docs/plans/. Use when starting any non-trivial task:
  "plan this feature", "how should we approach...", "let's think through...",
  or before any multi-file change.
  Do NOT use for trivial single-file edits or questions that need no planning.
  Supports multi-LLM mode — offloads codebase exploration and learnings research to Gemini CLI to preserve Claude's token limits.
allowed-tools: Read, Glob, Grep, Bash, Task, AskUserQuestion, TodoWrite, Skill
metadata:
  version: "2.1.0"
  author: emmanuel
---

# Plan — Research-First Task Planning

Transform feature descriptions, bug reports, or improvement ideas into well-structured, research-grounded implementation plans.

Inspired by the compound engineering philosophy: "80% planning and research, 20% execution."

## When to Use This Skill

Activate when:
- User says "plan", "how should we", "let's think through", "what's the best approach"
- Starting any feature or change touching 3+ files
- Task involves unfamiliar parts of the codebase
- Before any architectural decision
- User explicitly asks for a plan

## Philosophy

**Never plan in the dark.** Every plan should be grounded in:
1. What the codebase actually looks like today (not assumptions)
2. Existing patterns the team already uses
3. Past solutions to similar problems (check `docs/solutions/`)
4. Clarified requirements (not guesses)
5. Known risks and constraints

## Multi-LLM Mode Support

This skill supports multi-LLM delegation to reduce Claude token consumption.

### Mode Check (Required First Step)

1. Read `.claude/llm-mode.json` — if `mode` is `"multi"`, use the **Gemini-Delegated Path** below
2. If `mode` is `"single"` or file doesn't exist, skip to the **Standard Path** (the Planning Process section below)
3. If Gemini delegation fails at any point, fall back to the Standard Path silently

### Gemini-Delegated Path

In multi mode, Phase 1 Research Tracks A and C are delegated to Gemini CLI. Tracks B and D stay with Claude (B calls `/brief` which has its own delegation; D needs live `package.json` checks).

**Track A (Codebase Exploration) → Gemini:**

Adjust the `@folders` based on the task. For a typical feature, use `@web/src/app/ @web/src/lib/ @web/src/components/`. For DB tasks, add `@supabase/`. For animation tasks, use `@web/src/remotion/`.

```bash
START_TIME=$(date +%s)
# Generate core rules for Gemini context
CORE_RULES=""
for p in "$HOME/Documents/Dev/lex/scripts/generate-core-rules.sh" "/Volumes/Home/Lex - DO NOT TOUCH/Dev/lex/scripts/generate-core-rules.sh"; do
  [ -f "$p" ] && CORE_RULES=$("$p" 2>/dev/null) && break
done
echo "You are exploring a codebase for Golden Corpus, a portfolio of AI products. Here are the behavioral rules and known failure patterns to consider:

${CORE_RULES:-No core rules available.}

---

Explore this Next.js codebase for the following task: [INSERT TASK DESCRIPTION].

Find and report:
1. Files that will need changes (with paths and relevant code excerpts)
2. Existing patterns for similar functionality (show examples)
3. Related tests, types, and utilities
4. Technical debt in the affected areas
5. Any configuration or environment variables relevant to this task

Include file paths and code excerpts for every finding." | npx @google/gemini-cli -m gemini-2.5-pro -p "" @web/src/app/ @web/src/lib/ @web/src/components/ -o text > .gemini_temp_plan_track_a.md 2>/dev/null
DURATION_A=$(($(date +%s) - START_TIME))
```

**Track C (Learnings Research) → Gemini:**

```bash
START_TIME=$(date +%s)
# Core rules already loaded above (from Track A)
echo "You are searching documentation for Golden Corpus projects. Use the behavioral rules and failure patterns from context.

Search these documentation directories for anything relevant to: [INSERT TASK DESCRIPTION].

Look for:
1. Previously solved similar problems (with solution details)
2. Past decisions that constrain or inform this work
3. Best practices documented for this type of task
4. Known issues or gotchas in the affected areas

Quote relevant passages and cite file paths for every finding." | npx @google/gemini-cli -m gemini-2.5-pro -p "" @docs/solutions/ @docs/decisions/ -o text > .gemini_temp_plan_track_c.md 2>/dev/null
DURATION_C=$(($(date +%s) - START_TIME))
```

**Tracks A and C can run sequentially** (they use the same CLI). Track B (`/brief`) and Track D (dependency check) continue as normal Claude tasks in parallel.

**After Gemini delegation completes:**

1. Check if each temp file exists and is non-empty. If either failed, fall back to the Standard Path for that track only.
2. Read each successful temp file using the Read tool
3. **Spot-check 2-3 cited file paths** per track — verify they actually exist (Gemini can hallucinate paths). Drop or correct bad paths.
4. Use the Gemini output as research input for Phase 2+, enriching with Claude's own analysis
5. Delete temp files: `rm -f .gemini_temp_plan_track_a.md .gemini_temp_plan_track_c.md`

**Log the delegation:**

Append to `.claude/delegation.log` and update stats in `.claude/llm-mode.json`:

For successful delegations:
```bash
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
DURATION=$(($(date +%s) - START_TIME))
echo "$TIMESTAMP | plan | ok | ${DURATION}s | Track A codebase exploration for: [short task description]" >> .claude/delegation.log
python3 -c "
import json, datetime
f='.claude/llm-mode.json'
try:
  with open(f) as fh: d=json.load(fh)
  d['stats']['delegations_total'] = d['stats'].get('delegations_total',0) + 1
  d['stats']['last_delegation'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
  with open(f,'w') as fh: json.dump(d, fh, indent=2)
except: pass
"
```

For failed delegations:
```bash
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
DURATION=$(($(date +%s) - START_TIME))
echo "$TIMESTAMP | plan | fail | ${DURATION}s | Track A codebase exploration for: [short task description] (fell back to Standard Path)" >> .claude/delegation.log
python3 -c "
import json, datetime
f='.claude/llm-mode.json'
try:
  with open(f) as fh: d=json.load(fh)
  d['stats']['delegations_failed'] = d['stats'].get('delegations_failed',0) + 1
  d['stats']['last_delegation'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
  with open(f,'w') as fh: json.dump(d, fh, indent=2)
except: pass
"
```

---

### Standard Path

The standard path is the original behavior — Claude handles all research tracks directly. Use this when in single-LLM mode or as fallback.

## The Planning Process

### Phase 0: Idea Refinement

Before researching, understand the request:

1. **Check for brainstorms:** Search `docs/brainstorms/` for recent brainstorm documents matching this feature. If found, read thoroughly and carry forward ALL decisions — skip refinement questions that were already answered. Reference with: "(see brainstorm: docs/brainstorms/<filename>)"
2. **Check for existing plans:** Search `docs/plans/` for plans related to this feature
3. **Check for past solutions:** Search `docs/solutions/` for previously solved similar problems
4. **Assess the request:** Is it a feature, bug fix, refactor, or improvement?
5. **Gauge risk level:** Does this touch security, payments, auth, animation generation, or external APIs? (high-risk topics need external research in Phase 1)

If the request is vague and no brainstorm exists, ask 1-2 refinement questions before launching research.

### Phase 1: Parallel Research

Launch these research tasks **in parallel** using the Task tool. Tailor the prompts to the specific task.

> **Multi-LLM note:** In multi mode, Tracks A and C are handled by Gemini CLI (see Multi-LLM Mode Support above). Only Tracks B and D are launched as Claude sub-agents. The Gemini outputs are used as pre-loaded research for Phase 2+.

#### Research Track A: Codebase Exploration
Use `subagent_type: Explore` to understand the current state:
- Find files that will be affected by this change
- Identify existing patterns for similar functionality
- Check for related code, tests, types, and utilities
- Surface any technical debt in the affected areas

#### Research Track B: Pre-Task Briefing
Invoke the `/brief` skill with a description of the task. This surfaces:
- Hard constraints and terminology rules
- Known issues in the areas being touched
- Related existing work (to avoid duplication)
- Strategic context and business objectives

#### Research Track C: Learnings Research
Search `docs/solutions/` and `docs/decisions/log.md` for:
- Previously solved similar problems
- Past decisions that constrain this work
- Patterns that have been documented as best practices

#### Research Track D: Dependency Check (when relevant)
For tasks involving external libraries, APIs, or integrations:
- Check current versions in package.json
- Look for existing usage patterns in the codebase
- Identify potential conflicts or breaking changes

### Phase 1.5: Research Decision (Conditional)

After local research completes, decide if external research is needed:

| Signal | Action |
|--------|--------|
| High-risk topic (security, payments, APIs) | Research current best practices via web |
| Strong local patterns exist | Skip external research |
| New library or framework feature | Check latest docs via web |
| Uncertainty about approach | Research alternatives via web |
| Animation generation (Remotion/LLM prompts) | Check `.claude/skills/remotion-best-practices/rules/` |

### Phase 2: Ask Clarifying Questions

**Before producing any plan**, ask the user clarifying questions using AskUserQuestion. Good questions to consider:

- **Scope:** "Should this also handle [edge case]?"
- **Priority:** "What matters most — speed, robustness, or simplicity?"
- **Constraints:** "Any requirements I should know about that aren't in the codebase?"
- **Approach:** When multiple valid approaches exist, present them with tradeoffs

Only ask questions that would meaningfully change the plan. Skip if the task is clear.

### Phase 3: Choose Detail Level

Based on task complexity, choose the appropriate plan depth:

#### Minimal (quick tasks, 3-5 files)
- Problem statement
- Steps with file paths
- Success criteria

#### Standard (typical features, 5-15 files)
- Context from research
- Problem statement and motivation
- Proposed approach with rationale
- Step-by-step implementation plan
- Technical considerations
- Acceptance criteria
- Risks and mitigations

#### Comprehensive (large features, architectural changes, 15+ files)
- Executive summary
- Detailed problem analysis
- Comprehensive solution design with phases
- Alternative approaches considered (and why rejected)
- Technical specifications
- Database schema changes (with migration plan)
- API contract changes
- Risk mitigation strategies
- Testing strategy
- Future extensibility considerations

### Phase 4: Write the Plan

#### Plan File

Create the plan file at `docs/plans/YYYY-MM-DD-<type>-<descriptive-name>-plan.md`:

```markdown
# [Plan Title]

**Type:** feat | fix | refactor | chore | docs
**Date:** YYYY-MM-DD
**Status:** draft | approved | in-progress | completed

## Context
What we learned from research (key findings only, not a data dump).
Reference specific files and patterns discovered.

## Problem Statement
What needs to change and why.

## Proposed Approach
The chosen strategy and rationale (1-3 sentences).

## Implementation Steps

### Step 1: [Description]
- **Files:** `path/to/file.ts`
- **Changes:** What specifically changes
- **Depends on:** (nothing | Step N)

### Step 2: [Description]
...

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [Impact] | [How we handle it] |

## Success Criteria
- [ ] What "done" looks like
- [ ] How we verify it works

## Out of Scope
Things we're deliberately NOT doing (and why).

## Research Notes
Key findings from the research phase. Reference `docs/solutions/` entries if relevant.
```

Valid filename examples:
- `2026-02-15-feat-animation-generator-plan.md`
- `2026-02-15-fix-remotion-player-embed-plan.md`
- `2026-02-15-refactor-llm-routing-plan.md`

#### Task Tracking

Also create a TodoWrite task list from the implementation steps for real-time tracking.

### Phase 4.5: Spec Flow Analysis (Standard and Comprehensive plans)

For Standard and Comprehensive plans, run the `spec-flow-analyzer` agent against the drafted plan to surface missing flows, edge cases, and gaps:

1. Invoke the `spec-flow-analyzer` agent, passing it the plan file path
2. Review its output for Critical and Important gaps
3. Fold Critical gaps into the plan (add steps, risks, or out-of-scope notes)
4. Include Important gaps as an "Open Questions" appendix for user review
5. Skip Nice-to-have items unless trivial to address

**Skip this phase** for Minimal plans or when the user has asked for speed over thoroughness.

### Phase 5: Present and Get Approval

Present the plan summary to the user. Then offer next steps:

1. **Approve and start working** — hand off to `/multi-phase-feature` or direct implementation
2. **Adjust the plan** — modify scope, approach, or steps
3. **Deepen research** — investigate specific areas further before committing
4. **Shelve for later** — save the plan in `docs/plans/` for future reference

**Do NOT start coding until the user approves the plan.**

## Plan Quality Checklist

Before presenting the plan, verify:

- [ ] Every step references specific files/locations discovered during research
- [ ] The approach follows existing codebase patterns (don't invent new ones without reason)
- [ ] Dependencies between steps are clear (what must happen before what)
- [ ] Success criteria are testable, not vague
- [ ] Nothing is assumed — if uncertain, it was asked in Phase 2
- [ ] Past solutions in `docs/solutions/` have been checked for relevant patterns
- [ ] The plan file exists in `docs/plans/` with correct naming
- [ ] For animation features: `.claude/skills/remotion-best-practices/rules/` has been consulted

## Anti-Patterns

- **Planning without research:** Don't produce a plan from assumptions. Always explore first.
- **Over-planning:** A plan for a 3-step task should be 3 steps, not 15. Match plan complexity to task complexity.
- **Ignoring existing patterns:** If the codebase already does something similar, the plan should follow that pattern.
- **Asking obvious questions:** Don't ask "Should I write tests?" if the codebase already has tests for similar features. Just include them.
- **Vague steps:** "Implement the feature" is not a step. "Add `generateAnimation` function to `lib/animation.ts` following the pattern in `lib/export.ts`" is a step.
- **Ignoring past solutions:** Always check `docs/solutions/` before planning. Someone may have already solved a similar problem.

## Integration with Other Skills

- **Before planning:** `/brief` is invoked automatically in Phase 1
- **After approval:** Hand off to `/multi-phase-feature` for complex features, or proceed directly for simpler tasks
- **After completion:** `/learn` captures what went well or poorly
- **As part of `/lfg`:** This skill runs as Phase 1 of the full compound loop
- **For animation work:** `/remotion-best-practices` should be consulted before any animation-related planning

## Project Context

**Product:** FluxDiagram — AI tool that generates professional animated diagrams/visuals for embedding in slides (Google Slides, PowerPoint, Keynote).

**Tech stack:** Next.js (Vercel), Supabase (Postgres + Auth), Stripe, Remotion (animations), Resend (email), PostHog (analytics), Cloudflare R2 (storage), Anthropic Claude + OpenAI + Google (AI generation).

**Domains:** fluxdiagram.com (SEO), fluxdiagram.app (web app), fluxdiagram.dev (API/developer portal).

**Key constraints:**
- Bootstrap model — no VC, organic growth only
- Two animation types: Standard (GPT-5 Nano/Mini, ~$0.036/ea) and Premium (Claude Sonnet/Gemini Pro, ~$0.25/ea)
- Complement to PowerPoint/Slides/Keynote — never a replacement
- Terminology: "animated visual" not "video", "describe" not "prompt", "generate" not "create", "embed" not "insert"

## Troubleshooting

**Research finds conflicting patterns:**
- Present both patterns to the user with tradeoffs. Let them decide which to follow. Log the decision in `docs/decisions/log.md`.

**User wants to skip planning:**
- For genuinely simple tasks, that's fine. Planning adds overhead. If the task is <3 files and the approach is obvious, just do it.

**Plan becomes stale mid-implementation:**
- Plans are living documents. If you discover something during implementation that invalidates the plan, stop, update the plan, and re-confirm with the user.

**Existing plan found in Phase 0:**
- If a plan already exists for this feature, present it to the user. Ask: "Continue from this plan, update it, or start fresh?"
