#!/bin/bash
# pre-completion-check.sh — Claude Code Stop hook
#
# Fires when the agent finishes a turn. Injects a pre-completion checklist
# to verify the task was fully addressed before declaring done.
#
# Keep it lightweight — a reminder, not a blocker.

set -euo pipefail

INPUT=$(cat)

# Output the checklist as a brief, scannable reminder
cat <<'CHECKLIST'
PRE-COMPLETION CHECK: Before finishing —
1. Re-read the original request. Does your output fully address it?
2. Verify all changes are saved and correct.
3. Run tests if applicable and confirm they pass.
4. Check for unintended regressions.
5. If significant work was done this session, update docs/sessions/log.md and touch .claude/hooks/.session-summarized
CHECKLIST
