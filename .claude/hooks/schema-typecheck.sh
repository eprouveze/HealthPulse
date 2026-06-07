#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: when src/lib/schema.ts is edited, run an advisory tsc --noEmit.
# Advisory only — always exits 0; surfaces type errors without blocking the edit.

input="$(cat)"

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')"

case "$file_path" in
  */src/lib/schema.ts|src/lib/schema.ts)
    ;;
  *)
    exit 0
    ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

echo "[schema-typecheck] schema.ts changed — running tsc --noEmit (advisory)..."
if npx --no-install tsc --noEmit 2>&1; then
  echo "[schema-typecheck] no type errors."
else
  echo "[schema-typecheck] type errors detected above (advisory — edit not blocked)."
fi

exit 0
