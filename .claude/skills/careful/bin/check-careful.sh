#!/usr/bin/env bash
# check-careful.sh — PreToolUse hook for Bash
# Warns before destructive commands, user can override

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

if [[ -z "$CMD" ]]; then
  exit 0
fi

warn() {
  local msg="$1"
  cat <<EOF
{"permissionDecision":"ask","message":"$msg"}
EOF
  exit 0
}

# --- Safe exceptions (skip warning) ---

# rm -rf of known safe targets
if echo "$CMD" | grep -qE 'rm\s+(-rf|-fr)\s+(node_modules|\.next|dist|__pycache__|\.cache|build|\.turbo|coverage)'; then
  exit 0
fi

# git add -u is safe
if echo "$CMD" | grep -qE 'git\s+add\s+-u'; then
  exit 0
fi

# --- Destructive patterns ---

# rm -rf / rm -r / rm --recursive
if echo "$CMD" | grep -qE 'rm\s+(-[a-z]*r[a-z]*|--recursive)'; then
  warn "CAREFUL: Recursive delete detected. Verify the target path is correct before proceeding."
fi

# DROP TABLE / DROP DATABASE / TRUNCATE
if echo "$CMD" | grep -qiE '(DROP\s+(TABLE|DATABASE)|TRUNCATE)'; then
  warn "CAREFUL: SQL destructive operation detected. This will permanently delete data."
fi

# git push --force / -f
if echo "$CMD" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
  warn "CAREFUL: Force push detected. This rewrites remote history and can destroy others' work."
fi

# git reset --hard
if echo "$CMD" | grep -qE 'git\s+reset\s+--hard'; then
  warn "CAREFUL: Hard reset detected. All uncommitted changes will be permanently lost."
fi

# git checkout . / git restore .
if echo "$CMD" | grep -qE 'git\s+(checkout|restore)\s+\.'; then
  warn "CAREFUL: This discards all uncommitted changes in the working tree."
fi

# git add -A / git add . (Golden Corpus pattern)
if echo "$CMD" | grep -qE 'git\s+add\s+(-A|\.)'; then
  warn "CAREFUL: git add -A/. stages EVERYTHING including junk files and debug scripts. Use git add <specific-files> or git add -u instead."
fi

# nohup (Golden Corpus pattern)
if echo "$CMD" | grep -qE '\bnohup\b'; then
  warn "CAREFUL: nohup detected. If this is a systemd-managed service (gc-bot, etc.), use systemctl restart <service> instead. Manual nohup creates duplicate instances."
fi

# kubectl delete
if echo "$CMD" | grep -qE 'kubectl\s+delete'; then
  warn "CAREFUL: kubectl delete detected. This affects the production cluster."
fi

# docker rm -f / docker system prune
if echo "$CMD" | grep -qE 'docker\s+(rm\s+-f|system\s+prune)'; then
  warn "CAREFUL: Docker destructive operation detected. Containers or images will be permanently removed."
fi

# No match — allow
exit 0
