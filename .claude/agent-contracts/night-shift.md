# Agent Contract: Night Shift

**Agent ID:** night-shift  
**Version:** 2026-04-07  
**Runner:** M2 Mac Mini (via launchd, scripts/night-shift.sh)

## Allowed Repos
- Any repo under `/Volumes/Home/Dev/` that appears as `project:` in the task frontmatter
- Lex repo (`/Volumes/Home/Dev/lex`) for: PROGRESS.md, agent-reports, task state, commits to `docs/agent-tasks/`

## Allowed File Operations
- **Read**: any file in the target repo worktree
- **Write/Edit**: any file inside the worktree that is:
  - Within task scope (scope_paths frontmatter, or default allowlist: `content/`, `docs/`, `app/`, `lib/`, `components/`, `public/`)
  - PROGRESS.md and docs/agent-reports/ (always allowed)
  - `.claude/qa-annotations.md`, `.claude/scratchpad.md`, `.claude/sandwich-verify.md`
- **Forbidden**: writing outside the git worktree, writing to `/Volumes/Home/Dev/lex/` except as noted above

## Allowed External Communications
- `git push` to GitHub via `gh` CLI (task branch only, never force-push to main)
- Slack notification via `notify_slack()` (read-only token, post-only to configured channel)
- No email, no external APIs, no external file writes

## Escalation Triggers
- Agent self-reports FAILED in PROGRESS.md → Bridle gate blocks QA, quarantined to `blocked/`
- Agent produces 0 commits → quarantined to `blocked/`
- SPEC_QUALITY: POOR at intake → quarantined to `blocked/needs-clarification`
- OVERSIZED task → skipped, human notified
- 2+ consecutive content task golden path violations → PARTIAL annotation

## Maximum Unsupervised Runtime
- Per task: `timeout:` frontmatter (default 3600s). Hard limit via `gtimeout`.
- Per shift: no limit, but tasks run sequentially, not in parallel.

## Data Sensitivity
- Reads: project source code, CLAUDE.md, project-intel.md — all internal
- Writes: code, documentation, markdown reports — all in git history
- Forbidden: reading `.env`, API keys, secrets — these must not appear in agent reports
