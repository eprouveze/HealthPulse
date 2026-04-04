---
name: freeze
version: 1.0.0
description: |
  Restrict file edits to a specific directory for the session. Blocks Edit and
  Write outside the allowed path. Use when debugging to prevent accidentally
  modifying unrelated code, or when scoping agent work to one module.
  Use when asked to "freeze", "restrict edits", "only edit this folder",
  "lock down edits", or "scope edits to".
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
  SessionEnd:
    - matcher: ""
      hooks:
        - type: command
          command: "rm -f ${HOME}/.claude/freeze-dir.txt"
---

# /freeze — Restrict Edits to a Directory

Lock file edits to a specific directory. Any Edit or Write operation targeting
a file outside the allowed path will be **blocked**.

## Setup

Ask the user which directory to restrict edits to. Use AskUserQuestion:

- Question: "Which directory should I restrict edits to? Files outside this path will be blocked from editing."
- Text input (not multiple choice) — the user types a path.

Once the user provides a directory path:

1. Resolve it to an absolute path:
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. Ensure trailing slash and save to the freeze state file:
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
echo "$FREEZE_DIR" > "$HOME/.claude/freeze-dir.txt"
echo "Freeze boundary set: $FREEZE_DIR"
```

Tell the user: "Edits are now restricted to `<path>/`. Any Edit or Write
outside this directory will be blocked. To remove it, run `/unfreeze` or end the session."

## Auto-cleanup

The freeze boundary is **session-scoped**:
- **SessionEnd hook** automatically deletes the freeze state file when the session ends
- **SessionStart** in the hook script checks for stale freeze files older than 24h and removes them
- Running `/unfreeze` removes it immediately

This guarantees you will never be stuck in a frozen state across sessions.

## How it works

The hook reads `file_path` from the Edit/Write tool input JSON, then checks
whether the path starts with the freeze directory. If not, it returns
`permissionDecision: "deny"` to block the operation.

## Notes

- The trailing `/` prevents `/src` from matching `/src-old`
- Freeze applies to Edit and Write tools only — Read, Bash, Glob, Grep are unaffected
- This prevents accidental edits, not a security boundary — Bash `sed` can still modify files
- To deactivate: run `/unfreeze`, end the session, or start a new one
