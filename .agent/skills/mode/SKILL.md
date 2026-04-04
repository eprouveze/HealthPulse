---
name: mode
description: >
  Toggle between single-LLM (Claude-only) and multi-LLM (delegate to Gemini, Codex, Perplexity)
  modes. Shows current mode, affected skills, delegation stats, and logs.
  Use when user says 'switch to multi', 'use gemini', 'delegation status', 'how many delegations', 'token savings', or wants to change LLM routing mode.
  Use: "/mode" (status), "/mode multi" (switch), "/mode single" (switch), "/mode stats" (logs).
allowed-tools: Bash, Read, Write
user-invocable: true
metadata:
  version: "2.0.0"
  author: emmanuel
---

# LLM Mode Switch

Manage delegation across the multi-LLM triad to reduce Claude token consumption:
- **Gemini CLI** — heavy reading (docs, codebase exploration) — FREE (flat-rate subscription)
- **Codex CLI** — heavy writing (code generation, refactoring) — FREE (flat-rate subscription)
- **Perplexity API** — surgical web search (live docs, breaking changes) — PAID ($5/month credit, use sparingly)

## IMMEDIATE ACTION — Route by Argument

Parse the argument after `/mode`:

- **No args** → **SHOW STATUS**
- **`multi`** → **SWITCH TO MULTI**
- **`single`** → **SWITCH TO SINGLE**
- **`stats`** → **SHOW DELEGATION LOG**
- **`reset`** → **RESET TO DEFAULTS**

> **Council moved to `/council`** — use `/council <question>` for 3-model advisory.

---

## SHOW STATUS (Default)

Read `.claude/llm-mode.json` and display:

```
## LLM Mode: [MULTI / SINGLE]

### Delegation Targets (in multi mode)

  READING (Gemini CLI — free, flat-rate)
  /brief         Doc reading → Gemini         ~30-50K tokens saved per use
  /plan          Research tracks A+C → Gemini  ~20-30K tokens saved per use
  /seo-optimize  Blog data collection → Gemini ~40-60K tokens saved per use
  /learn         Context + docs + classify     ~15-25K tokens saved per use

  WRITING (Codex CLI — free, flat-rate)
  /codex-write   Code generation → Codex       ~500-5000 tokens saved per use

  WEB SEARCH (Perplexity API — $5/month, use sparingly)
  /web-scout     Surgical web queries          ~$0.05-0.50 per query

### External Tools
  Gemini CLI:    [available / not found]  v[X.Y.Z]
  Codex CLI:     [available / not found]  v[X.Y.Z]
  Perplexity:    [key set / key missing]

### Delegation Stats
  Total:     [N] successful delegations
  Failed:    [N] ([X%] failure rate)
  Last:      [YYYY-MM-DD HH:MM] via [skill]

Switch with: /mode multi  or  /mode single
Full log:    /mode stats
```

To populate this:
1. Read `.claude/llm-mode.json` for mode and stats
2. Run `npx @google/gemini-cli --version 2>/dev/null` to check Gemini
3. Run `codex --version 2>/dev/null` to check Codex
4. Check `$PERPLEXITY_API_KEY` is set
5. Count lines in `.claude/delegation.log` (excluding comments) for total delegations

If `.claude/llm-mode.json` doesn't exist, show: `Mode: SINGLE (default — no config file yet)`

---

## SWITCH TO MULTI

1. **Verify Gemini CLI is installed:**
   ```bash
   npx @google/gemini-cli --version 2>/dev/null
   ```
   If fails → abort with: "Gemini CLI not found. Install with: `npm install -g @google/gemini-cli`"

2. **Verify Gemini CLI is authenticated:**
   ```bash
   npx @google/gemini-cli -p "Reply with exactly: OK" -o text 2>/dev/null
   ```
   If fails or doesn't contain "OK" → abort with: "Gemini CLI not authenticated. Run `npx @google/gemini-cli` interactively to set up auth."

3. **Update config:**
   Read `.claude/llm-mode.json`, set `mode` to `"multi"`, update `updated_at` to current ISO timestamp, write back.

4. **Log the switch:**
   Append to `.claude/delegation.log`:
   ```
   YYYY-MM-DDTHH:MM:SSZ | mode | ok | 0s | Switched to multi-LLM mode
   ```

5. **Check Codex CLI (non-blocking):**
   ```bash
   codex --version 2>/dev/null
   ```
   If found → note as available. If not → note as "not found (install: npm i -g @openai/codex)"

6. **Check Perplexity API key (non-blocking):**
   Check if `$PERPLEXITY_API_KEY` is set in the environment.
   If set → note as available. If not → note as "key not set"

7. **Confirm:**
   ```
   ## Switched to Multi-LLM Mode

   READING (Gemini CLI — free):
     /brief         Doc reading delegated
     /plan          Research tracks A+C delegated
     /seo-optimize  Blog data collection delegated
     /learn         Context + docs + classify delegated

   WRITING (Codex CLI — free):
     /codex-write   Code generation delegated       [available / not found]

   WEB SEARCH (Perplexity API — $5/month budget):
     /web-scout     Surgical web queries            [available / key not set]

   Claude handles: orchestration, judgment, review, surgical fixes

   Switch back: /mode single
   ```

---

## SWITCH TO SINGLE

1. Read `.claude/llm-mode.json`, set `mode` to `"single"`, update `updated_at`, write back.
2. Log: `YYYY-MM-DDTHH:MM:SSZ | mode | ok | 0s | Switched to single-LLM mode`
3. Confirm: "Switched to Single-LLM Mode. All skills using Claude natively."

---

## SHOW DELEGATION LOG

Read `.claude/delegation.log` and display the last 20 entries in a table:

```
## Delegation Log (last 20 entries)

| Timestamp           | Skill        | Status | Duration | Notes                |
|---------------------|-------------|--------|----------|----------------------|
| 2026-02-17 14:30:00 | brief       | ok     | 45s      | Briefing for blog post task |
| 2026-02-17 14:28:00 | plan        | ok     | 62s      | Track A codebase exploration |
| 2026-02-17 13:15:00 | brief       | fail   | 120s     | Timeout — fell back to Claude |
```

Also show summary stats:
- Total delegations (ok + fail)
- Failure rate
- Average duration for successful delegations
- Most-delegated skill

---

## RESET

1. Write fresh `.claude/llm-mode.json` with defaults (single mode, zeroed stats)
2. Clear `.claude/delegation.log` (keep header comments only)
3. Confirm: "Reset to defaults. Mode: single. Stats and logs cleared."

---

## Delegation Logging Protocol

**This section is referenced by other skills.** When any skill delegates to an external LLM (Gemini, Codex, or Perplexity):

### After successful delegation:
```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | SKILL_NAME | ok | DURATIONs | NOTES" >> .claude/delegation.log
```

Also update `.claude/llm-mode.json`:
- Increment `stats.delegations_total`
- Set `stats.last_delegation` to current ISO timestamp

### After failed delegation:
```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | SKILL_NAME | fail | DURATIONs | REASON" >> .claude/delegation.log
```

Also update `.claude/llm-mode.json`:
- Increment `stats.delegations_failed`

### Duration measurement:
Record the wall-clock time of the `npx @google/gemini-cli` invocation. In bash:
```bash
START_TIME=$(date +%s)
# ... gemini invocation ...
DURATION=$(($(date +%s) - START_TIME))
```

Skills don't need to implement this as literal bash — Claude tracks the timing and appends the log entry after delegation completes.
