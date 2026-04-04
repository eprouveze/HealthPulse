---
name: deferred
description: >
  Check and execute deferred actions from a timestamped queue. Use when user says
  "check deferred", "scheduled tasks", "queued actions", or at session start to
  process overdue work. Supports check (execute due actions), add (schedule new),
  and list (show pending with countdown). Supports one-time and recurring actions
  (daily, weekly, monthly, or custom cron-like intervals). Parses docs/deferred-actions.md.
  Do NOT use for immediate task execution or todo list management.
metadata:
  version: "1.1.0"
  author: emmanuel
  argument-hint: "[check|add|list]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Deferred Task Runner

Process a timestamped action queue from `docs/deferred-actions.md`. Actions are scheduled for future dates and executed when due.

## Subcommands

### `/deferred` or `/deferred check` (default)

1. Read `docs/deferred-actions.md`
2. Parse all `<!--ACTION ... -->` HTML comment blocks in the **Queue** section
3. Extract `id`, `due`, `status`, and `summary` from each block's YAML-like fields
4. For each action where `status: pending`:
   - Parse `due` as a date or datetime (treat as JST).
   - Get current time in **JST** (Japan Standard Time).
   - If `due` < (current time - 7 days): flag as **STALE**. Report: "Action '{summary}' is {N} days overdue. Options: execute now, reschedule, decompose into smaller tasks, or drop." Do not auto-execute stale actions without explicit instruction.
   - If `due` <= current time (and not stale): **execute the action**.
   - If `due` > current time: report "Not yet due — [time remaining]".
5. After successfully executing an action:
   - **One-time actions** (no `recur` field):
     - Update `status: pending` to `status: done` in the comment block
     - Add `completed: YYYY-MM-DD` to the comment block
     - Move the entire action block to the **## Completed** section
   - **Recurring actions** (has `recur` field):
     - Do NOT change `status` — it stays `pending`
     - Add `last-run: YYYY-MM-DD` to the comment block (update if already present)
     - Increment `run-count` by 1 (add `run-count: 1` if not present)
     - Compute the next `due` date from the current `due` using the `recur` interval and update it in-place
     - The action block stays in the **## Queue** section
     - If the action has `recur-until` and the new `due` date exceeds it, treat it as a one-time action completing for the last time (mark done, move to Completed, add `completed` and note `series-complete: true`)
6. Report summary: X actions executed (Y recurring, Z one-time completed), W still pending, V not yet due

### `/deferred add`

1. Ask the user for:
   - **Summary**: One-line description
   - **Due date**: YYYY-MM-DD format
   - **Recurring?**: Whether this action repeats. If yes, ask for:
     - **Interval**: One of `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`, or a custom interval like `every 3 days`, `every 2 weeks`
     - **End date** (optional): YYYY-MM-DD after which recurrence stops (`recur-until`). If omitted, recurs indefinitely.
   - **Detailed steps**: What to do when the action fires
   - **Verification command** (optional): How to verify success
2. Generate a unique id from the date and a slug of the summary (e.g., `2026-03-01-add-pricing-page`)
3. Create a new block and append it to the **## Queue** section.

**One-time action format:**

```markdown
<!--ACTION
id: {generated-id}
due: {due-date}
status: pending
summary: {summary}
-->

**Due:** {due-date} | **Status:** pending

{detailed steps from user}

**Verify:** `{verification command}`

---
```

**Recurring action format:**

```markdown
<!--ACTION
id: {generated-id}
due: {due-date}
status: pending
recur: {interval}
recur-until: {end-date or omit line if indefinite}
run-count: 0
summary: {summary}
-->

**Due:** {due-date} | **Status:** pending | **Recurs:** {interval}

{detailed steps from user}

**Verify:** `{verification command}`

---
```

### `/deferred list`

1. Read `docs/deferred-actions.md`
2. Parse all `<!--ACTION ... -->` blocks
3. Display a table of pending actions:
   - ID, due date, days until due (or "OVERDUE" if past), recurrence (if any), run count (if recurring), summary
4. Also show count of completed actions

## Parsing Rules

- Action metadata lives inside `<!--ACTION ... -->` HTML comments
- Each field is on its own line: `key: value`
- The human-readable description follows the closing `-->` and extends until the next `---` horizontal rule or next `<!--ACTION` comment
- The `status` field is the source of truth: `pending` or `done`
- The `recur` field (optional) marks an action as recurring. If absent, the action is one-time.
- Additional recurring fields: `recur-until`, `last-run`, `run-count`, `series-complete`

## Recurrence Scheduling

### Supported Intervals

| Interval | Meaning |
|---|---|
| `daily` | Every day |
| `weekly` | Every 7 days |
| `biweekly` | Every 14 days |
| `monthly` | Same day next month (clamped to month-end if needed, e.g., Jan 31 -> Feb 28) |
| `quarterly` | Every 3 months |
| `yearly` | Every 12 months |
| `every N days` | Every N calendar days |
| `every N weeks` | Every N * 7 calendar days |
| `every N months` | Every N months (day clamped to month-end) |

### Next Due Date Calculation

1. Start from the current `due` date (not from today — this prevents drift if a check runs late)
2. Add the interval to compute the next due date
3. If the next due date is still in the past (missed multiple cycles), keep adding intervals until it's in the future
4. Update the `due` field in the comment block to the computed next date
5. Update the human-readable `**Due:**` line to match

### End-of-Series Handling

- If `recur-until` is set and the computed next `due` exceeds it:
  - Mark `status: done`, add `completed: YYYY-MM-DD` and `series-complete: true`
  - Move the action to the **## Completed** section
  - Report: "Recurring action '{summary}' completed its final run ({run-count} total runs)"

## Execution Rules

- Execute actions exactly as described in their markdown body
- If an action has a **Verify** step, run it after execution
- If verification fails, do NOT mark the action as done — report the failure
- If an action is ambiguous, ask the user before executing
- For recurring actions, after execution update `last-run`, increment `run-count`, and advance `due` to the next occurrence

## File Location

The queue file is always at `docs/deferred-actions.md` relative to the project root.

## Troubleshooting

**Queue file does not exist:**
- Cause: `docs/deferred-actions.md` has not been created yet
- Fix: Create the file with `## Queue` and `## Completed` section headers

**Action parsed but not executing:**
- Cause: The `due` date is in the future, or `status` is already `done`
- Fix: Check the parsed due date against current JST time; verify `status: pending` in the comment block

**Malformed action block not detected:**
- Cause: Missing or misformatted fields inside the HTML comment
- Fix: Ensure each field (`id`, `due`, `status`, `summary`) is on its own line with `key: value` format

**Recurring action not advancing:**
- Cause: The `recur` field is missing or uses an unsupported interval format
- Fix: Ensure `recur` is one of the supported intervals (daily, weekly, biweekly, monthly, quarterly, yearly, or `every N days/weeks/months`)

**Recurring action ran but due date is still in the past:**
- Cause: Multiple cycles were missed; the single-increment landed on another past date
- Fix: The skill should keep adding intervals until the next `due` is in the future. If this didn't happen, manually set `due` to an upcoming date
