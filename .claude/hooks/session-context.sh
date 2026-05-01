#!/bin/bash
# session-context.sh — Claude Code SessionStart hook
#
# Fires at session start. Reads the last 2-3 entries from docs/sessions/log.md
# and outputs them as context. Also writes a session ID file used by edit-counter.sh.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
SESSION_LOG="$PROJECT_DIR/docs/sessions/log.md"

# Clean up loop-detector state from the previous session before writing new ID
SESSION_ID_FILE="$PROJECT_DIR/.claude/hooks/.session-id"
OLD_SESSION_ID=$(cat "$SESSION_ID_FILE" 2>/dev/null || true)
if [ -n "$OLD_SESSION_ID" ]; then
  rm -f "/tmp/claude-loop-edits-${OLD_SESSION_ID}" \
        "/tmp/claude-loop-replans-${OLD_SESSION_ID}" \
        "/tmp/claude-loop-bash-errors-${OLD_SESSION_ID}" \
        "/tmp/claude-loop-reads-${OLD_SESSION_ID}" \
        "/tmp/claude-loop-dir-replans-${OLD_SESSION_ID}" 2>/dev/null || true
fi

# Write a stable session ID for use by loop-detector.sh
echo "$(date +%s)" > "$SESSION_ID_FILE"

if [ ! -f "$SESSION_LOG" ]; then
  exit 0
fi

# Extract the last 2-3 ### Session blocks from the last 100 lines
RECENT=$(tail -100 "$SESSION_LOG")

SESSIONS=$(echo "$RECENT" | awk '
  /^### / {
    if (buf != "") { sessions[++count] = buf }
    buf = $0 "\n"
    next
  }
  buf != "" { buf = buf $0 "\n" }
  END {
    if (buf != "") { sessions[++count] = buf }
    start = (count > 2) ? count - 1 : 1
    for (i = start; i <= count; i++) { print sessions[i] }
  }
')

if [ -n "$SESSIONS" ]; then
  echo "SESSION CONTEXT — Recent activity (docs/sessions/log.md):"
  echo "$SESSIONS"
  echo "---"
fi

# Relay check nudge — remind Claude to check for Town-Lex relay messages
echo "RELAY CHECK: Run /relay to check for pending messages from Town-Lex (daily triage summary arrives at 06:10 JST)."
