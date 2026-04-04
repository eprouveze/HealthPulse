---
name: brainstorm
description: >
  Explore requirements and approaches through collaborative dialogue before planning.
  Captures WHAT to build and WHY, leaving HOW to /plan. Use when requirements are
  unclear, when exploring multiple approaches, or before any complex feature.
  Trigger phrases: "brainstorm", "let's think about", "explore approaches",
  "what should we build", "requirements for". Do NOT use for tasks with clear requirements.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion, Write
---

# Brainstorm — Explore Before You Plan

Answers the WHAT and WHY before /plan answers the HOW. Prevents wasted planning on unclear requirements.

## When to Use

- Requirements are vague or ambiguous
- Multiple valid approaches exist
- Scope needs narrowing
- User says "let's think about", "explore", "brainstorm"

Do NOT use when:
- Requirements are already clear and specific
- User just wants implementation (use /plan or /lfg directly)

## IMMEDIATE ACTION

### Phase 1: Assess Clarity

Read the user's request. If requirements are already clear and specific, say so and suggest going directly to /plan. Don't force brainstorming when it's not needed.

### Phase 2: Lightweight Research

Launch 2 parallel agents (background, Haiku model):

**Agent A: Codebase Scout**
- Search for existing patterns related to the request
- Check CLAUDE.md for relevant constraints
- Find similar implementations in the codebase

**Agent B: Past Solutions**
- Search docs/solutions/ for related work
- Check docs/decisions/log.md for prior decisions on this topic
- Surface any relevant learnings

### Phase 3: Collaborative Exploration

Ask questions **ONE AT A TIME** using AskUserQuestion. Never dump 5 questions at once.

Guidelines:
- Use multiple-choice when natural options exist
- Validate assumptions explicitly ("I'm assuming X — correct?")
- Explore 2-3 concrete approaches with pros/cons
- Lead with your recommendation
- Apply YAGNI — push back on unnecessary complexity
- Track open questions explicitly

### Phase 4: Capture

Write the brainstorm document to `docs/brainstorms/YYYY-MM-DD-<topic>.md`:

```markdown
# Brainstorm: [Topic]

**Date:** YYYY-MM-DD
**Status:** Complete

## What We're Building
[Clear statement of the feature/change]

## Why This Approach
[Rationale for the chosen direction]

## Key Decisions
- [Decision 1]: [choice made] — because [reason]
- [Decision 2]: [choice made] — because [reason]

## Open Questions
- [ ] [Any unresolved questions — MUST be answered before planning]

## Approaches Considered
### Option A: [name] (recommended / rejected)
- Pros: ...
- Cons: ...

### Option B: [name] (recommended / rejected)
- Pros: ...
- Cons: ...

## Next Step
→ /plan [brief description referencing this brainstorm]
```

### Phase 5: Handoff

Present next steps:
1. Review and refine the brainstorm
2. Proceed to /plan (which will auto-detect and carry forward this brainstorm)
3. Ask more questions
4. Done for now

## Integration with /plan

When /plan runs, it checks for recent brainstorm documents in docs/brainstorms/ matching the feature description. If found, it carries forward ALL decisions and skips refinement questions.

## Anti-Patterns

- **Brainstorming clear requirements**: If the user knows exactly what they want, skip to /plan
- **Asking all questions upfront**: ONE question at a time
- **Paraphrasing decisions**: Reference the brainstorm file directly, don't re-summarize
- **Leaving open questions unresolved**: Flag them explicitly — they block planning
