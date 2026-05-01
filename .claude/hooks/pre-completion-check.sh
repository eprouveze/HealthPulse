#!/bin/bash
# pre-completion-check.sh — Claude Code Stop hook
#
# Spec Verification Gate: verifies work against acceptance criteria before exit.
#
# Two modes:
# 1. SPEC MODE: If a task file with Done Criteria exists, demand evidence per criterion
# 2. GENERIC MODE: Fall back to general checklist for ad-hoc sessions
#
# Part of the Lex harness engineering upgrades (2026-04-07).

set -euo pipefail

INPUT=$(cat)

# Normalize project dir across CLIs (Claude Code / Gemini CLI)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}}"
SESSION_ID=$(cat "$PROJECT_DIR/.claude/hooks/.session-id" 2>/dev/null || echo "default")

# --- Attempt SPEC MODE: find task file with acceptance criteria ---
TASK_SPEC=""
CRITERIA=""

# Check for running task files (Night Shift moves tasks to running/)
for task_dir in "$PROJECT_DIR/docs/agent-tasks/running" "$PROJECT_DIR/docs/agent-tasks/pending"; do
  if [ -d "$task_dir" ]; then
    for f in "$task_dir"/*.md; do
      [ -f "$f" ] || continue
      TASK_SPEC="$f"
      break 2
    done
  fi
done

# Extract criteria from task file
if [ -n "$TASK_SPEC" ]; then
  # Try ## Done Criteria first, then ## Quality checklist
  CRITERIA=$(sed -n '/^## Done Criteria/,/^## /{ /^## Done Criteria/d; /^## /d; p; }' "$TASK_SPEC" 2>/dev/null)
  if [ -z "$CRITERIA" ]; then
    CRITERIA=$(sed -n '/^## Quality checklist/,/^## /{ /^## Quality checklist/d; /^## /d; p; }' "$TASK_SPEC" 2>/dev/null)
  fi
fi

# --- Criteria quality check ---
# If criteria exist but are weak (<3 items or weasel words), supplement with generic checklist
SUPPLEMENT_GENERIC=""
if [ -n "$CRITERIA" ]; then
  CRITERIA_COUNT=$(echo "$CRITERIA" | grep -cE '^\s*-\s*\[' 2>/dev/null || true)
  CRITERIA_COUNT=${CRITERIA_COUNT:-0}
  WEASEL_MATCH=$(echo "$CRITERIA" | grep -iE '\b(good|clean|appropriate|optimized|proper|nice|better|correct|reasonable)\b' 2>/dev/null || true)
  if [ "$CRITERIA_COUNT" -lt 3 ] || [ -n "$WEASEL_MATCH" ]; then
    SUPPLEMENT_GENERIC="true"
  fi
fi

# --- Output based on mode ---
if [ -n "$CRITERIA" ]; then
  # SPEC MODE: demand evidence per criterion
  TASK_NAME=$(basename "$TASK_SPEC" .md)
  cat <<SPECGATE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPEC VERIFICATION GATE — Task: $TASK_NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EACH criterion below, state PASS (with evidence) or FAIL:

$CRITERIA

If ANY criterion is FAIL:
→ EXIT BLOCKED. Fix the failures before finishing.
→ Do not declare this task complete with unmet criteria.

If ALL criteria PASS:
→ You may proceed to finish. Include the evidence in your response.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECGATE

  # Supplement with generic checklist if criteria are weak
  if [ -n "$SUPPLEMENT_GENERIC" ]; then
    echo ""
    echo "⚠️ SPEC QUALITY WARNING: Criteria are vague or incomplete (<3 items, or contain weasel words)."
    echo "Additional generic checklist applies:"
    echo "1. Re-read the original request. Does your output fully address it?"
    echo "2. List the 3 most important changes you made and verify each is correct."
    echo "3. Run tests if applicable and confirm they pass."
    echo "4. Check for unintended regressions in files you touched."
  fi

else
  # GENERIC MODE: general checklist for ad-hoc sessions
  cat <<'GENERIC'
PRE-COMPLETION CHECK: Before finishing —
1. Re-read the original request. Does your output fully address it?
2. List the 3 most important changes you made and verify each is correct.
3. Run tests if applicable and confirm they pass.
4. Check for unintended regressions in files you touched.
GENERIC
fi

# --- Tool & skill usage summary (always include) ---
TRACKER_FILE="/tmp/claude-tool-tracker-${SESSION_ID}"

if [ -f "$TRACKER_FILE" ]; then
  TOTAL=$(wc -l < "$TRACKER_FILE" | tr -d ' ')

  # Top tools by frequency
  TOOL_SUMMARY=$(awk -F'|' '{print $2}' "$TRACKER_FILE" | sort | uniq -c | sort -rn | head -8 | awk 'NR>1{printf ", "}{printf "%s (%d)", $2, $1}')

  # Skills used (deduplicated)
  SKILLS=$(awk -F'|' '$3 ~ /^skill:/ {sub(/^skill:/, "", $3); print $3}' "$TRACKER_FILE" | sort -u | paste -sd', ' -)

  # Agent types used (deduplicated)
  AGENTS=$(awk -F'|' '$3 ~ /^agent:/ {sub(/^agent:/, "", $3); print $3}' "$TRACKER_FILE" | sort -u | paste -sd', ' -)

  echo ""
  echo "TOOL/SKILL USAGE THIS SESSION ($TOTAL tool calls):"
  echo "  Tools: $TOOL_SUMMARY"
  [ -n "$SKILLS" ] && echo "  Skills: $SKILLS"
  [ -n "$AGENTS" ] && echo "  Agent types: $AGENTS"
  echo "  → Include in session log under **Tools & skills used:**"
fi
