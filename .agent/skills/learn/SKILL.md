---
name: learn
description: >
  Capture session learnings into persistent project memory. Spawns parallel
  sub-agents to analyze context, extract solutions, find related docs, and
  classify learnings. Stores solutions in docs/solutions/ for future reference.
  Use after completing a feature, fixing a tricky bug, or when the user says
  "what did we learn", "capture this", "remember this", "that worked", "it's fixed".
  Do NOT use mid-task — finish the work first, then learn from it.
  Supports multi-LLM mode — offloads context analysis, related docs, and classification to Gemini CLI to preserve Claude's token limits.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite, AskUserQuestion
metadata:
  version: "2.1.0"
  author: emmanuel
---

# Learn — Compound Knowledge Capture

Extract patterns, decisions, and solutions from the current session and persist them so future sessions benefit.

Inspired by the compound engineering philosophy: "Each documented solution compounds your team's knowledge. The first time you solve a problem takes research. Document it, and the next occurrence takes minutes."

## When to Use This Skill

Activate when:
- After completing a feature or significant task
- User says "what did we learn", "capture this", "remember this for next time"
- After fixing a tricky bug (capture the root cause and fix pattern)
- After a review found issues (capture what to watch for)
- As Phase 4 of the `/lfg` compound loop
- Auto-trigger phrases: "that worked", "it's fixed", "working now", "problem solved"

Do NOT use:
- Mid-task (finish first, then learn)
- For routine changes with nothing new to capture
- To document features (that's README/docs territory)

## Philosophy

Each cycle compounds knowledge:
1. **First occurrence:** 30-minute research to solve the problem
2. **Document the solution:** 5 minutes of structured documentation
3. **Next similar issue:** 2-minute lookup in `docs/solutions/`
4. **Team knowledge compounds exponentially**

## Multi-LLM Mode Support

This skill supports multi-LLM delegation to reduce Claude token consumption.

### Mode Check (Required First Step)

1. Read `.claude/llm-mode.json` — if `mode` is `"multi"`, use the **Gemini-Delegated Path** below
2. If `mode` is `"single"` or file doesn't exist, skip to the **Standard Path** (the IMMEDIATE ACTION section below)
3. If Gemini delegation fails at any point, fall back to the Standard Path silently

### Gemini-Delegated Path

In multi mode, Agents A (Context Analyzer), C (Related Docs Finder), and E (Category Classifier) are delegated to Gemini CLI as a combined prompt. Agents B (Solution Extractor) and D (Prevention Strategist) stay with Claude — they require judgment about implementation quality and prevention strategies.

**Combined Agents A+C+E → Gemini:**

```bash
START_TIME=$(date +%s)
# Generate core rules for Gemini context (behavioral rules + failure atlas)
CORE_RULES=""
for p in "$HOME/Documents/Dev/lex/scripts/generate-core-rules.sh" "/Volumes/Home/Lex - DO NOT TOUCH/Dev/lex/scripts/generate-core-rules.sh"; do
  [ -f "$p" ] && CORE_RULES=$("$p" 2>/dev/null) && break
done
echo "You are analyzing work for Golden Corpus, a portfolio of AI-powered products built by Emmanuel Prouveze (Tokyo-based enterprise sales exec and solopreneur). Use the following behavioral rules and failure patterns as context for your analysis — they represent hard-won lessons from prior sessions:

${CORE_RULES:-No core rules available.}

---

Analyze the following information about a recently completed development session and produce three sections:

## CONTEXT ANALYSIS (Agent A)
From the git information below, identify:
- What type of problem was solved (bug, feature, refactor, performance, etc.)
- What symptoms or errors were observed
- What areas of the codebase were affected
- Generate a YAML frontmatter skeleton: title, date, category, tags, related

## RELATED DOCUMENTATION (Agent C)
Search the attached docs for:
- Related solutions that already exist
- Relevant decisions that were previously made
- Existing patterns that were extended or modified
- Cross-references to document
Quote relevant passages and cite file paths.

## CATEGORY CLASSIFICATION (Agent E)
Classify this session's work into ONE of these categories:
- build-errors — Build and compilation issues
- test-failures — Test debugging and fixes
- runtime-errors — Production/dev runtime issues
- performance-issues — Optimization solutions
- database-issues — Migration, query, schema fixes
- security-issues — Vulnerability fixes
- ui-bugs — Frontend rendering issues
- integration-issues — API, webhook, third-party issues
- architecture — Design pattern decisions
- i18n — Localization and translation issues
- feat — Feature implementation patterns

Explain your classification reasoning.

---
Git summary:
$(git diff HEAD~1 --stat 2>/dev/null || echo 'No recent diff available')

Last commit:
$(git log -1 --format='%s%n%b' 2>/dev/null || echo 'No recent commit')" | npx @google/gemini-cli -m gemini-2.5-pro -p "" @docs/solutions/ @docs/decisions/ -o text > .gemini_temp_learn_ace.md 2>/dev/null
DURATION=$(($(date +%s) - START_TIME))
```

**After delegation completes:**

1. Check if `.gemini_temp_learn_ace.md` exists and is non-empty. If not, fall back to Standard Path (launch all 5 agents via Claude).
2. Read the temp file using the Read tool
3. **Spot-check 2-3 cited file paths** — verify they actually exist (Gemini can hallucinate paths). Drop or correct bad paths.
4. Use the Gemini output as pre-loaded input for Step 1. Launch only Agents B (Solution Extractor) and D (Prevention Strategist) as Claude sub-agents.
5. Proceed to Step 2 (Assemble Solution Document) using combined Gemini + Claude agent outputs.
6. Delete temp file: `rm -f .gemini_temp_learn_ace.md`

**Log the delegation:**

After successful delegation, execute:
```bash
DURATION=$(($(date +%s) - START_TIME))
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | learn | ok | ${DURATION}s | Agents A+C+E for: [short session description]" >> .claude/delegation.log
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

If delegation failed and fell back to Standard Path, execute:
```bash
DURATION=$(($(date +%s) - START_TIME))
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | learn | fail | ${DURATION}s | Fell back to Standard Path — [reason]" >> .claude/delegation.log
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

The standard path is the original behavior — Claude launches all 5 agents directly. Use this when in single-LLM mode or as fallback.

## IMMEDIATE ACTION

### Step 0: Context Budget Check

Before launching 5 parallel sub-agents (~10K tokens), assess context pressure:
- If context is above 80% used, switch to **Compact-Safe Mode**: single-pass analysis without sub-agents. Extract problem/cause/solution directly from conversation. Write minimal solution doc. Skip specialized agent reviews.
- If context is below 80%, proceed with full parallel analysis below.

This prevents compaction mid-compound, which would lose the context needed to write accurate solution docs.

### Step 1: Parallel Analysis

Launch these sub-agents **in parallel** using the Task tool. Each returns text findings (not files).

> **Multi-LLM note:** In multi mode, Agents A, C, and E are pre-loaded by Gemini CLI (see Multi-LLM Mode Support above). Only Agents B and D are launched as Claude sub-agents. The Gemini output provides the context analysis, related docs, and classification.

#### Agent A: Context Analyzer
Examine the conversation history and git diff to identify:
- What type of problem was solved (bug, feature, refactor, performance, etc.)
- What symptoms or errors were observed
- What areas of the codebase were affected
- Return a YAML frontmatter skeleton for the solution doc

#### Agent B: Solution Extractor
Analyze the implementation to identify:
- The root cause of the problem (if it was a bug fix)
- The key implementation decisions made
- Working code examples from the changes
- Investigation steps taken (including what didn't work)

#### Agent C: Related Docs Finder
Search existing documentation for:
- Related solutions in `docs/solutions/`
- Relevant decisions in `docs/decisions/log.md`
- Existing patterns that were extended or modified
- Cross-references to document

#### Agent D: Prevention Strategist
Based on what happened, determine:
- How could this problem have been prevented?
- What tests would catch this in the future?
- Are there similar patterns elsewhere that might have the same issue?
- What best practices should be followed going forward?

#### Agent E: Category Classifier
Determine the best category for this solution:
- `build-errors/` — Build and compilation issues
- `test-failures/` — Test debugging and fixes
- `runtime-errors/` — Production/dev runtime issues
- `performance-issues/` — Optimization solutions
- `database-issues/` — Migration, query, schema fixes
- `security-issues/` — Vulnerability fixes
- `ui-bugs/` — Frontend rendering issues
- `integration-issues/` — API, webhook, third-party issues
- `architecture/` — Design pattern decisions
- `i18n/` — Localization and translation issues
- `feat/` — Feature implementation patterns

### Step 2: Assemble Solution Document

After all agents return, assemble a single solution document.

**Critical rule:** Only ONE file gets written — the final assembled solution doc. Sub-agents return text, not files.

Create the solution at `docs/solutions/[category]/[descriptive-name].md`:

```markdown
---
title: "[Solution Title]"
date: YYYY-MM-DD
category: [category]
tags: [tag1, tag2, tag3]
related: [paths to related docs/solutions]
---

# [Solution Title]

## Problem
What went wrong or what needed to be built. Include exact error messages if applicable.

## Symptoms
How the problem manifested (what the user/developer saw).

## Root Cause
Why the problem occurred (the underlying reason, not just the surface symptom).

## Solution

### What We Did
Step-by-step description of the fix/implementation.

### Key Code Changes
```typescript
// Before (if applicable)
...

// After
...
```

## Prevention
How to avoid this problem in the future:
- [ ] Test to add
- [ ] Pattern to follow
- [ ] Check to perform

## Related
- [Link to related solution]
- [Link to related decision]
```

### Step 3: Update Decision Log

For any significant decisions made during the session, append to `docs/decisions/log.md`:

1. Read the current file to understand the format
2. Append new entries following the existing format
3. Include: context, decision, alternatives considered, rationale

### Step 4: Update Session Log

Append a session summary to `docs/sessions/log.md`:

1. Read the current file for format
2. Append: date, branch, what was done, decisions made, open items

### Step 5: Consider CLAUDE.md Updates

If a pattern or anti-pattern is significant enough to affect every future session:

1. Draft the proposed addition
2. Present to the user: "I'd like to add this to CLAUDE.md — does this look right?"
3. Only edit after explicit approval

### Step 6: Summarize to User

```
## Session Learnings Captured

### Solution Documented
→ docs/solutions/[category]/[name].md
[One-line description of what was captured]

### Decisions Logged
- [Decision 1]: [one-line summary]

### Patterns Discovered
- [Pattern]: [brief description]

### Prevention Measures
- [What to watch for in future sessions]

### Files Updated
- docs/solutions/[category]/[name].md (new)
- docs/decisions/log.md — N new entries
- docs/sessions/log.md — session summary
```

## What NOT to Capture

- **Obvious things:** "We used TypeScript for type safety" — already known.
- **Temporary context:** "The build was slow today" — not useful for future sessions.
- **Implementation minutiae:** "Added function `foo`" — that's what git history is for.
- **Preferences without rationale:** "I prefer this approach" — say WHY.

## When Nothing Was Learned

Some sessions genuinely have no novel learnings. That's fine — it's actually a positive signal that existing docs and patterns are working well. In this case:
- Log the session summary in `docs/sessions/log.md`
- Skip the solution doc
- Move on

## Integration Points

- **After `/lfg` Phase 3:** Runs as Phase 4 of the compound loop
- **With `/cp` command:** `/cp` handles session log entries; `/learn` goes deeper with solutions and decisions
- **With `/brief`:** Solutions captured here are surfaced by `/brief` in future sessions via `docs/solutions/` search
- **With `/plan`:** Plans reference past solutions during research phase

## Directory Structure

```
docs/solutions/
├── architecture/        # Design pattern decisions
├── build-errors/        # Build and compilation fixes
├── database-issues/     # Migration, query, schema fixes
├── feat/                # Feature implementation patterns
├── i18n/                # Localization solutions
├── integration-issues/  # API, webhook, third-party fixes
├── performance-issues/  # Optimization solutions
├── runtime-errors/      # Production/dev runtime fixes
├── security-issues/     # Vulnerability fixes
├── test-failures/       # Test debugging solutions
└── ui-bugs/             # Frontend rendering fixes
```

## Troubleshooting

**Too many learnings:**
- Focus on the top 3-5 most impactful. Not every observation needs to be persisted.
- Ask: "Would a future session benefit from knowing this?" If no, skip it.

**Disagreement about what to capture:**
- The user has final say. Present suggestions, accept their edits.

**Solution already documented:**
- If `docs/solutions/` already has a relevant entry, update it rather than creating a duplicate. Add a "See also" cross-reference.
