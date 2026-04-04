---
name: brief
description: "Session briefing with project-aware context loading and spaced repetition. Loads project-intel, failure atlas, decisions, and cross-project capabilities BEFORE starting work. Use at session start, before any task, or when user says '/brief', 'brief me', 'what should I know', 'catch me up'."
effort: medium
allowed-tools: Read, Glob, Grep, Bash
user-invocable: true
metadata:
  version: "4.0.0"
  author: emmanuel
---

# /brief — Project-Aware Session Briefing

You are generating a context-aware briefing. This ensures you KNOW the project before starting work — not just what changed, but what the project IS, how it works, and what to avoid.

## Multi-LLM Mode Support

### Mode Check (Required First Step)

1. Read `.claude/llm-mode.json` — if `mode` is `"multi"`, use the **Gemini-Delegated Path** below
2. If `mode` is `"single"` or file doesn't exist, skip to the **Standard Path**
3. If Gemini delegation fails, fall back to Standard Path silently

### Gemini-Delegated Path

Delegate heavy doc reading to Gemini CLI:

```bash
echo "You are a research analyst. I am about to work on: [INSERT TASK DESCRIPTION].

Review all attached documentation and output a Pre-Task Briefing:
1. WATCH OUT — Past mistakes, forbidden patterns, known issues
2. HARD CONSTRAINTS — Non-negotiable rules (terminology, brand voice, legal)
3. PROJECT CONTEXT — What this project IS, tech stack, capabilities, known debt
4. STRATEGIC CONTEXT — Business goals, audience, market positioning
5. RELATED WORK — Existing content, features, or code that overlaps
6. RECOMMENDATIONS — Specific suggestions

Cite source file paths. Omit empty sections." | npx @google/gemini-cli -m gemini-3.1-pro-preview -p "" @.claude/project-intel.md @docs/ -o text > .gemini_temp_briefing.md 2>/dev/null
```

If delegation succeeds: Read, spot-check 2-3 paths, enrich, present. Delete temp file.
If delegation fails: fall back to Standard Path.

Log delegation to `.claude/delegation.log`.

---

### Standard Path

## Load Order (STRICT)

Execute these reads in parallel:

### Tier 1: Always load (every session)
1. **Project Intel** — Read `.claude/project-intel.md` in the CURRENT project directory. This tells you what the project IS: tech stack, capabilities, known issues, existing documentation. If this file doesn't exist, flag it: "No project-intel.md — operating with limited project context."
2. **Failure Atlas** — Read `~/Documents/Dev/lex/docs/memory/failure-atlas.md` — mistakes to avoid
3. **CLAUDE.md** — Read project-level `.claude/CLAUDE.md` or `CLAUDE.md` for conventions
4. **Feedback files** — Loaded via MEMORY.md (all 22 feedback_*.md)

### Tier 2: Project-specific context
5. **Project decisions** — Read `docs/decisions/log.md` if it exists (last 10 entries)
6. **Project session topics** — Read `docs/sessions/topics/*.md` if they exist
7. **Deferred actions** — Read `docs/deferred-actions.md` if it exists
8. **Lex decisions** — Read `~/Documents/Dev/lex/docs/decisions/log.md` (last 10 entries) for cross-project architectural context

### Tier 3: Cross-project awareness (Lex sessions or cross-project work)
9. **Capabilities** — Read `~/.claude/memory/capabilities.json` — what each project can do
10. **Topics** — Read `~/.claude/memory/topics.json` — topic graph
11. **Lex session topics** — Read `~/Documents/Dev/lex/docs/sessions/topics/` for relevant summaries
12. **Last session date** — Check `.claude/hooks/.session-summary-state` or last session log entry

### Project Detection
1. If CWD is inside `~/Documents/Dev/<project>/` → that's the project
2. If CWD is `~/Documents/Dev/lex/` → Lex session (cross-project), load lex intel + ask what project to focus on
3. If the user mentions a project name → load that project's intel
4. If unclear → ask: "Which project are you working on today?"

## Scoring Algorithm (for ranking briefing items)

```
score(item) = utility × recency × relevance × (1 - suppression)
```

| Item Type | Utility |
|-----------|---------|
| Mistake relevant to today's work | 1.0 |
| Decision made since last session | 0.9 |
| Deferred action due within 48h | 0.85 |
| Low-confidence topic for current project | 0.7 |
| Cross-project capability opportunity | 0.5 |

| Recency | Weight |
|---------|--------|
| Today | 1.0 |
| This week | 0.8 |
| This month | 0.5 |
| Older | 0.2 |

| Relevance | Weight |
|-----------|--------|
| Current project | 1.0 |
| Any active project | 0.5 |
| Universal | 0.3 |

| Suppression (spaced repetition) | |
|--------------------------------|---|
| Surfaced last session | 0.8 |
| 2 sessions ago | 0.4 |
| 3+ sessions ago | 0.0 |

## Output Format

Generate a synthesized narrative. DO NOT dump raw file contents.

```markdown
## Session Briefing — YYYY-MM-DD

### Project: [name]
[One-line summary from project-intel: what it is, tech stack, current state]

### Mistakes to Avoid
- **[trigger]** → [prevention rule] _(from: [evidence])_

### Since Last Session
- [Decision/change]: [what] because [why]

### Expiring Soon
- [Deferred action] due [date]: [description]
- Flag OVERDUE items prominently

### Confidence Gaps
- [Topic]: [what's uncertain and how to verify]

### Cross-Project Opportunities
- [project A] could use [capability] from [project B]

### Context
- [Top 3 relevant session topic summaries]
```

## Rules

- Return TOP 10 items across all sections (some may be empty — omit those)
- **Always include project-intel summary** — this is how you prove you know the project
- Always include Mistakes to Avoid if any are relevant
- Use JST time for all dates
- Link to evidence files
- If this is the FIRST session, include all feedback highlights and recent decisions

## Documentation Discovery (for projects without project-intel)

If `.claude/project-intel.md` doesn't exist:
1. `Glob` for `docs/**/*.md`, `content/**/*.md`
2. Read `CLAUDE.md` for conventions
3. Check `docs/feedback/`, `docs/content-review/`, `docs/plans/`
4. Check `.claude/skills/` for capabilities
5. Flag to user: "This project is missing project-intel.md — consider creating one"
