---
name: careful
version: 1.0.0
description: |
  Safety guardrails for destructive commands. Warns before rm -rf, DROP TABLE,
  force-push, git reset --hard, git add -A, nohup on VPS, and similar dangerous
  operations. User can override each warning. Use when touching prod, debugging
  live systems, or working in a shared environment. Use when asked to "be careful",
  "safety mode", "prod mode", or "careful mode".
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
---

# /careful — Destructive Command Guardrails

Safety mode is now **active**. Every bash command will be checked for destructive
patterns before running. If a destructive command is detected, you'll be warned
and can choose to proceed or cancel.

## What's protected

| Pattern | Example | Risk |
|---------|---------|------|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | Recursive delete |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | Data loss |
| `TRUNCATE` | `TRUNCATE orders;` | Data loss |
| `git push --force` / `-f` | `git push -f origin main` | History rewrite |
| `git reset --hard` | `git reset --hard HEAD~3` | Uncommitted work loss |
| `git checkout .` / `git restore .` | `git checkout .` | Uncommitted work loss |
| `git add -A` / `git add .` | `git add -A` | Stages everything including junk |
| `nohup` (on VPS) | `nohup node bot.js &` | Creates duplicate if systemd manages it |
| `kubectl delete` | `kubectl delete pod` | Production impact |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | Container/image loss |

## Safe exceptions (no warning)

- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage`
- `git add -u` (tracked files only — this is the safe alternative)

## Golden Corpus-specific patterns

These patterns come from the Failure Atlas — real mistakes that cost us time:

- **`git add -A`** warns: "Use `git add <specific-files>` or `git add -u` instead. `git add -A` stages everything including junk files, debug scripts, and hook state."
- **`nohup`** warns: "If this is a systemd-managed service (e.g. gc-bot), use `systemctl restart <service>` instead. Manual nohup creates duplicate instances."

## How it works

The hook reads the command from the tool input JSON, checks against patterns,
and returns `permissionDecision: "ask"` with a warning if matched. You can
always override and proceed.

To deactivate, end the conversation or start a new one. Hooks are session-scoped.
