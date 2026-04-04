#!/usr/bin/env bash
# check-freeze.sh — PreToolUse hook for Edit/Write
# Blocks file operations outside the frozen directory

set -euo pipefail

FREEZE_FILE="$HOME/.claude/freeze-dir.txt"

# Stale file cleanup: if freeze file is older than 24h, remove it (stale from crashed session)
if [[ -f "$FREEZE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    file_age=$(( $(date +%s) - $(stat -f %m "$FREEZE_FILE") ))
  else
    file_age=$(( $(date +%s) - $(stat -c %Y "$FREEZE_FILE") ))
  fi
  if (( file_age > 86400 )); then
    rm -f "$FREEZE_FILE"
  fi
fi

# If no freeze file, allow everything
if [[ ! -f "$FREEZE_FILE" ]]; then
  exit 0
fi

FREEZE_DIR=$(cat "$FREEZE_FILE")

# Read tool input from stdin (JSON with file_path)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

# Check if file is within the freeze boundary
if [[ "$FILE_PATH" == "$FREEZE_DIR"* ]]; then
  exit 0
else
  # Block the edit
  cat <<EOF
{"permissionDecision":"deny","message":"FROZEN: Edit blocked — file is outside the freeze boundary.\n  File: $FILE_PATH\n  Allowed: $FREEZE_DIR\nRun /unfreeze to remove the boundary."}
EOF
  exit 0
fi
