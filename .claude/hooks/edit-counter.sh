#!/bin/bash
# edit-counter.sh — Claude Code PostToolUse hook (Edit|Write)
#
# Tracks per-file edit counts within a session. After 5+ edits to the same
# file, nudges Claude to reconsider whether the approach is fundamentally correct.
#
# Uses a session ID written by session-context.sh at session start.

set -euo pipefail

INPUT=$(cat)

# Get the file path that was edited/written
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Use session-scoped counts file
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
SESSION_ID=$(cat "$PROJECT_DIR/.claude/hooks/.session-id" 2>/dev/null || echo "default")
COUNTS_FILE="/tmp/claude-edit-counts-${SESSION_ID}"

# Append this file path (one line per edit)
echo "$FILE_PATH" >> "$COUNTS_FILE"

# Count edits to this specific file
COUNT=$(grep -cF "$FILE_PATH" "$COUNTS_FILE" 2>/dev/null || echo 0)

# Nudge after 5+ edits to the same file
if [ "$COUNT" -ge 5 ]; then
  BASENAME=$(basename "$FILE_PATH")
  echo "EDIT-COUNTER: You've edited '$BASENAME' ${COUNT} times this session. Consider stepping back: is the fundamental approach correct, or are you iterating on a flawed design?"
fi
# pulled modification
