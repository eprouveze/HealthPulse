# Agent Contract: QA Gate

**Agent ID:** qa-gate  
**Version:** 2026-04-07  
**Runner:** M2 Mac Mini (via scripts/qa-review.sh, runs after Night Shift task succeeds)

## Allowed Repos
- Same repo as the Night Shift task it is reviewing (read access to the PR branch)
- Lex repo for: reading `.claude/qa-annotations.md`, writing QA result back

## Allowed File Operations
- **Read**: any file in the target repo (review purposes)
- **Write/Edit**: only `docs/agent-reports/<task>.md` (append QA result), `.claude/qa-review.md`
- **Create PR**: allowed via `gh pr create` on the task branch
- **Forbidden**: modifying source code, modifying project files, pushing to main

## Allowed External Communications
- Read GitHub PR diff via `gh` CLI
- Slack notification for QA result (pass/fail)
- No email, no external APIs

## Escalation Triggers
- QA FAIL → task quarantined to `blocked/`, human notified via Slack
- If `.claude/qa-annotations.md` has BRIDLE warnings → QA runs with high skepticism
- If Phase C sandwich says FAILED → QA must verify independently, not rubber-stamp

## Maximum Unsupervised Runtime
- Per task review: 600s timeout

## Data Sensitivity
- Reads: source code, test outputs, git diffs — internal only
- Forbidden: reading secrets, API keys, .env files
