---
name: second-opinion
version: 1.0.0
description: |
  Get a second opinion from OpenAI's Codex CLI (gpt-5.5). Three modes:
  review (pass/fail code review), challenge (adversarial — try to break it),
  and consult (multi-turn Q&A with session persistence). Uses ChatGPT Business
  subscription auth — NEVER an API key. Use when asked for "second opinion",
  "codex review", "adversarial review", "challenge this code", "cross-model review",
  or "/second-opinion".
allowed-tools:
  - Bash
  - Read
---

# /second-opinion — Cross-LLM Review via Codex CLI

Get an independent review from OpenAI's gpt-5.5 model. Three modes
for different needs.

## CRITICAL: Authentication

Codex CLI MUST use `chatgpt` auth mode (ChatGPT Business subscription).
**NEVER use an API key.** Verify before running:

```bash
grep -q '"auth_mode": "chatgpt"' ~/.codex/auth.json && echo "OK: Using ChatGPT subscription" || echo "ERROR: Not using ChatGPT auth"
```

If not authenticated, tell the user to run `! codex login` (interactive).

## Mode Detection

Parse user input to determine mode:

| Input | Mode |
|-------|------|
| `/second-opinion review` | Review |
| `/second-opinion challenge` or `/second-opinion challenge security` | Challenge |
| `/second-opinion <any question>` | Consult |
| `/second-opinion` (no args) | Auto-detect: if uncommitted changes exist → Review, else → Consult |

## Mode 1: Review (pass/fail code review)

Reviews the current diff against the base branch.

```bash
cd <project-root>
codex review --base HEAD~1 -c 'model_reasoning_effort="xhigh"' 2>/dev/null
```

Or against a specific base:
```bash
codex review --base main -c 'model_reasoning_effort="xhigh"' 2>/dev/null
```

**Output handling:**
- Present Codex's output verbatim inside a `### CODEX SAYS` section
- Look for `[P1]` markers in the output — these are critical findings
- If P1 found: verdict is **FAIL** with list of critical issues
- If no P1: verdict is **PASS**
- Add token count and comparison note if Claude's `/review` already ran

**Timeout:** 300 seconds (5 minutes). If it times out, say "Diff may be too large or API is slow."

## Mode 2: Challenge (adversarial)

Try to break the code. Finds edge cases, race conditions, security holes.

```bash
cd <project-root>
DIFF=$(git diff HEAD~1)
codex exec "You are an adversarial code reviewer. Your job is to BREAK this code. Find edge cases, race conditions, security vulnerabilities, error handling gaps, and failure modes. Be aggressive and thorough. Here is the diff:\n\n$DIFF" \
  -s read-only \
  -c 'model_reasoning_effort="xhigh"' \
  --json 2>/dev/null
```

If the user specifies a focus domain (e.g., `/second-opinion challenge security`):
```bash
codex exec "You are a security auditor. Find injection vectors, auth bypasses, SSRF, XSS, CSRF, and data exposure in this diff:\n\n$DIFF" \
  -s read-only \
  -c 'model_reasoning_effort="xhigh"' \
  --json 2>/dev/null
```

**Output handling:**
- Parse JSONL output: extract `agent_message` and `reasoning` fields
- Present ALL findings verbatim — never summarize or editorialize
- Group by severity if Codex provides severity markers

## Mode 3: Consult (multi-turn Q&A)

Ask Codex anything with session persistence for follow-ups.

**First question:**
```bash
cd <project-root>
RESULT=$(codex exec "<user's question>" \
  -s read-only \
  -c 'model_reasoning_effort="xhigh"' \
  --json 2>/dev/null)
echo "$RESULT"
```

Save session ID for follow-ups:
```bash
SESSION_ID=$(echo "$RESULT" | python3 -c "
import sys,json
for line in sys.stdin:
    try:
        d=json.loads(line)
        if 'session_id' in d: print(d['session_id']); break
    except: pass
" 2>/dev/null)
if [[ -n "$SESSION_ID" ]]; then
  mkdir -p .context
  echo "$SESSION_ID" > .context/codex-session-id
fi
```

**Follow-up questions:**
```bash
SESSION_ID=$(cat .context/codex-session-id 2>/dev/null)
if [[ -n "$SESSION_ID" ]]; then
  codex exec resume "$SESSION_ID" "<follow-up question>" \
    -s read-only \
    -c 'model_reasoning_effort="xhigh"' \
    --json 2>/dev/null
else
  # No session — start fresh
  codex exec "<question>" -s read-only -c 'model_reasoning_effort="xhigh"' --json 2>/dev/null
fi
```

## Golden Rules

1. **Never editorialize Codex's output.** Show it verbatim in a `### CODEX SAYS` block.
2. **Never use API key auth.** Always verify `chatgpt` auth mode before running.
3. **Always use `-s read-only`** for challenge and consult modes (sandbox).
4. **Always use `model_reasoning_effort="xhigh"`** for maximum reasoning depth.
5. **Timeout is 300s** on all Bash calls to Codex.
6. **Compare, don't compete.** If Claude already reviewed the same code, note where Codex agrees or disagrees — both perspectives are valuable.

## Error Handling

| Error | Fix |
|-------|-----|
| `codex: command not found` | `npm install -g @openai/codex` |
| Auth failure / token expired | User runs `! codex login` |
| Timeout (300s) | Diff too large or API slow — try with smaller scope |
| Empty response | Check stderr: `codex exec "test" 2>&1` |
| Session resume fails | Delete `.context/codex-session-id`, start fresh |

## Cost

This uses the ChatGPT Business subscription (included in the monthly fee).
There is NO per-token API cost. Use freely.
