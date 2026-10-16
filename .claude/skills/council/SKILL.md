---
name: council
description: >
  5-model PREMIUM council — Lex's most precious tool. Ask Lexi (Gemini 3.1 Pro Preview),
  LexT (gpt-5.5 + xhigh reasoning), Kimi (Moonshot K2.6), LexD (gpt-5.5 + xhigh reasoning),
  and LeK (DeepSeek-v4-pro + R1 reasoning) the same question in parallel; save responses
  to persistent files; synthesize consensus. Each seat is maxed for capability — quality
  matters more than latency or cost (~$0.50–$1.00 per call, 60-180s wall time).
  Use when user says 'ask the council', 'get opinions', 'council on', 'what do they all think',
  'multi-model opinion', or wants strategic input from multiple LLMs before making a decision.
  Use: "/council <question>" or "/council" (reads question from conversation context).
  Use "--collab" flag for 2-round collaborative mode where members challenge each other's R1 responses.
allowed-tools: Bash, Read, Write, Agent, Glob
user-invocable: true
metadata:
  version: "1.2.0"
  author: emmanuel
  filePattern: "docs/council-sessions/**"
---

# Council — 5-Model Strategic Advisory

Ask the same question to Lexi (Gemini 3.1 Pro Preview), LexT (Codex CLI / gpt-5.5 + xhigh
reasoning), Kimi (Moonshot K2.6), LexD (Codex CLI / gpt-5.5 + xhigh reasoning), and LeK
(DeepSeek-v4-pro via api.deepseek.com + R1 reasoning enabled) in parallel. Each advisor
writes their response directly to a persistent file. Lex (the orchestrator, Claude Opus)
synthesizes — Opus is NOT a council seat because Lex IS Opus; including Opus would be
self-querying.

**Premium-tier defaults — each seat maxed for the model/auth path available:**
- **Lexi (Gemini 3.1 Pro Preview):** Theorist — research-grounded, framework-driven. Latest Google flagship via subscription. Override: `LEXI_GEMINI_MODEL=gemini-2.5-pro` for cheaper.
- **LexT (Codex CLI / gpt-5.5, reasoning_effort=xhigh):** Validator — eval methodology, defensible cases. Maxed effort within ChatGPT subscription (gpt-5.4-pro requires API tier, not available). Override: `LEXT_EFFORT=high` or `LEXT_CODEX_MODEL=gpt-5.5`.
- **Kimi (Moonshot K2.6, thinking OFF):** Provocateur — challenges premises, uncomfortable truths. Empirically verified (2026-04-22): thinking-on HURT council quality for Provocateur (locks into wrong framing inside reasoning trace). Stay OFF.
- **LexD (Codex CLI / gpt-5.5, reasoning_effort=xhigh):** Diagnostician — names mechanism, cites stratified evidence, commits to action. Maxed effort within ChatGPT subscription. Override: `LEXD_EFFORT=high` or `LEXD_CODEX_MODEL=gpt-5.5`.
- **LeK (DeepSeek-v4-pro + R1 reasoning, effort=max):** Field Engineer — ready-to-paste artifacts, tabular root-cause analysis, iterative offers. Premium DeepSeek (12× cost vs flash) + reasoning trace via API param. Override: `LEK_MODEL=deepseek-v4-flash` and/or `LEK_THINKING=0` for cost.

**Naming convention:** suffix matches the last letter of the underlying provider/model where
unique (Lex**i** ← Gemin**i**, Lex**T** ← ChatGP**T**, Le**K** ← DeepSee**K**). LexD breaks the
pattern intentionally — it's the second OpenAI seat, named for its function (Diagnostician)
since both LexT and LexD use Codex CLI.

## PREPARATION PROTOCOL (MANDATORY — DO NOT SKIP)

Before launching any advisors, you MUST assemble a comprehensive brief. The brief IS the work.
Budget 15-30 minutes on preparation. If it takes less than 15 minutes, you're not being thorough enough.

### Step 0: Research
1. **`/recall`** the topic — check for prior decisions, related council sessions, relevant context
2. **Read the FULL source material** — if the question is about an article, read the entire article. If about code, read the full files. Never work from memory.
3. **Pull data** — PostHog analytics, GSC performance, Stripe data, whatever's relevant to the decision
4. **Steel-man both sides** — before writing the brief, think through the strongest case FOR and AGAINST

### Step 0.5: Write the Brief
Use the template at `docs/council-sessions/BRIEF-TEMPLATE.md`. The question.md file must contain ALL of these sections:

1. **Decision Required** — one sentence
2. **Why Now** — trigger, deadline, dependency
3. **Full Source Material** — the COMPLETE document (paste it, never summarize)
4. **Performance Data** — analytics from PostHog/GSC/Stripe
5. **Historical Context** — prior decisions from /recall, related sessions
6. **The Case FOR** — steel-man the current approach
7. **The Case AGAINST** — problems + evidence
8. **Proposed Alternatives** — each with pros/cons/cost
9. **Specific Questions** — numbered, answerable with clear recommendations
10. **Constraints** — timeline, dependencies, blast radius

**Ground Rules:**
- NEVER send a summary. Advisors form opinions from primary sources.
- ALWAYS include data. No data = the session is not ready.
- Steel-man BOTH sides to prevent anchoring bias.
- Specific questions, not "what do you think?"

---

## EXECUTION

1. **Extract the question** from the argument or conversation context.
   If no question is provided, ask the user.

2. **Create output directory:**
   ```
   docs/council-sessions/YYYY-MM-DD-<slug>/
   ```
   `<slug>` = first 5 words of the question, lowercase, hyphenated, max 50 chars.

3. **Write the question:**
   ```
   docs/council-sessions/YYYY-MM-DD-<slug>/question.md
   ```

4. **Write the question to a temp file for LLM input:**
   ```
   /tmp/council-question-<timestamp>.txt
   ```
   This avoids shell argument limits and env var issues.

5. **Launch 3 agents in parallel** (all background, all use Agent tool):

   Each agent receives this prompt:
   ```
   Read the file /tmp/council-question-<timestamp>.txt.
   Call callLLMWithMetadata from ~/.claude/scripts/llm-cli with:
     provider: "<provider>"
     model: "<model>"
     prompt: <contents of the question file>
     timeout: 300000
   Write the COMPLETE response to <output_path> using the Write tool.
   Return "done" as your final message.
   ```

   | Agent Name | Provider | Model | Output File |
   |------------|----------|-------|-------------|
   | council-opus | anthropic | opus | `docs/council-sessions/.../opus.md` |
   | council-gemini | google | gemini-2.5-pro | `docs/council-sessions/.../gemini.md` |
   | council-gpt | openai | gpt-5.5 | `docs/council-sessions/.../gpt54.md` |
   | council-kimi | moonshot | kimi-k2.5 | `docs/council-sessions/.../kimi.md` |

   **Kimi call method:** Kimi uses the Moonshot API (OpenAI-compatible). Call via curl:
   ```bash
   source /path/to/lex/.env.local  # contains KIMI_API_KEY
   curl -s https://api.moonshot.ai/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $KIMI_API_KEY" \
     -d '{"model":"kimi-k2.5","messages":[{"role":"user","content":"..."}],"temperature":1}'
   ```
   The agent should read the question file, call Kimi via Bash curl, extract `.choices[0].message.content` with jq, and write to the output file.

   **CRITICAL RULES:**
   - Each agent MUST write to the output file using Write tool — NOT stdout
   - Use `mode: "bypassPermissions"` so agents can write without prompts
   - Use `model: "haiku"` for the agent wrapper (the real LLM call is inside callLLMWithMetadata or curl for Kimi)
   - All 4 MUST run in parallel (single message with 4 Agent tool calls)
   - Set `run_in_background: false` — wait for all 4 to complete

6. **Verify all 3 responses exist:**
   Check file sizes. If any response is empty or <100 chars, note the failure.

7. **Synthesize:**
   Read all 4 response files. Write `synthesis.md` containing:

   ```markdown
   # Council Synthesis — <date>

   ## Question
   <the question>

   ## Consensus (agreed by 2/3 or 3/3)
   - <point 1>
   - <point 2>
   ...

   ## Disagreements
   | Topic | Opus | Gemini | GPT-5.4 | Kimi |
   |-------|------|--------|---------|------|
   | ... | ... | ... | ... | ... |

   ## Recommendation
   <Lex's synthesis based on all 4 inputs + own judgment>

   ## Advisors
   - Opus: <one-line summary of their position>
   - Gemini (The Theorist): <one-line summary>
   - GPT-5.4 (The Validator): <one-line summary>
   - Kimi (The Provocateur): <one-line summary>
   ```

8. **Present the synthesis** to the user in chat.

9. **Clean up temp file:**
   ```bash
   rm /tmp/council-question-<timestamp>.txt
   ```

10. **Log:**
    Append to `.claude/delegation.log`:
    ```
    TIMESTAMP | council | ok | DURATIONs | Q: <first 50 chars>... → docs/council-sessions/YYYY-MM-DD-<slug>/
    ```

## OUTPUT STRUCTURE

```
docs/council-sessions/YYYY-MM-DD-<slug>/
  question.md      — the question asked
  opus.md          — Claude Opus 4.6 response
  gemini.md        — Gemini 2.5 Pro (The Theorist) response
  gpt54.md         — GPT-5.4 (The Validator) response
  kimi.md          — Kimi K2.5 (The Provocateur) response
  synthesis.md     — consensus + disagreements + recommendation
```

## WHEN TO USE

- **Strategic decisions** — architecture, pricing, market positioning
- **Format/design choices** — like Runtime Block format (XML vs JSON vs YAML)
- **Risk assessment** — before committing to a major change
- **Research questions** — when you want diverse perspectives
- **Tiebreakers** — when 2 options seem equivalent

## WHEN NOT TO USE

- Simple factual lookups (use /web-scout or /recall)
- Code generation (use /codex-write or /pair-session)
- Quick opinions (use /second-opinion for a single external view)

---

## `--collab` MODE — `/council --collab <question>`

Two-round collaborative session. Round 1 is identical to standard council (all 4 respond blind, in parallel). Round 2 gives each member the other three R1 responses and asks them to challenge, revise, or double down.

**When to use:** High-stakes decisions where you want models to stress-test each other.
**When NOT to use:** Quick opinion checks — the overhead isn't worth it.

### Round 1 — identical to standard execution

Run all 4 advisors in parallel exactly as described in EXECUTION above.
Output files: `opus.md`, `gemini.md`, `gpt54.md`, `kimi.md`

### Round 2 — cross-pollinated challenge

After all R1 files exist, Lex reads all 4 R1 responses, then writes 4 R2 prompt files to `/tmp/`:

```
/tmp/council-r2-<timestamp>-opus.txt
/tmp/council-r2-<timestamp>-gemini.txt
/tmp/council-r2-<timestamp>-gpt.txt
/tmp/council-r2-<timestamp>-kimi.txt
```

Each file contains the full R2 prompt for that advisor:

```
## Original question
<contents of question.md>

## Your Round 1 response
<contents of this advisor's R1 file>

## What your colleagues said

### Opus (Round 1)
<contents of opus.md — or "N/A (this is you)" if Opus>

### Gemini (Round 1)
<contents of gemini.md — or "N/A (this is you)" if Gemini>

### GPT-5.4 (Round 1)
<contents of gpt54.md — or "N/A (this is you)" if GPT>

### Kimi K2.5 (Round 1)
<contents of kimi.md — or "N/A (this is you)" if Kimi>

## Your task
You have seen your colleagues' responses. Now:
1. Do you stand by your Round 1 position? Say so explicitly.
2. What did a colleague identify that you missed or underweighted?
3. What in their responses do you disagree with, and why?
4. Revised recommendation (if any) — or restate your original if unchanged.

Be direct. Do not summarize your R1. Focus on what changed (or didn't) after seeing the others.
```

Then launch all 4 R2 agents in parallel. Each agent receives:
```
Read the file /tmp/council-r2-<timestamp>-<advisor>.txt.
Call callLLMWithMetadata (or curl for Kimi) with the file contents as prompt.
Write the COMPLETE response to <output_path> using the Write tool.
Return "done".
```

R2 output files: `opus-r2.md`, `gemini-r2.md`, `gpt54-r2.md`, `kimi-r2.md`

**CRITICAL:** Write all 4 R2 `/tmp` files before launching any R2 agents. Clean up all R2 tmp files after synthesis alongside the question tmp file.

### Synthesis for `--collab`

Read all 8 files (4× R1 + 4× R2). Synthesize into `synthesis.md`:

```markdown
# Council Synthesis — <date> (collab mode)

## Question
<the question>

## What shifted between rounds
| Advisor | R1 position | R2 revision | Shifted? |
|---------|-------------|-------------|----------|
| Opus    | <summary>   | <summary>   | Yes/No   |
| Gemini  | ...         | ...         | ...      |
| GPT-5.4 | ...         | ...         | ...      |
| Kimi    | ...         | ...         | ...      |

## Consensus after debate (R2)
- <point agreed by 2+ advisors after cross-pollination>

## Surviving disagreements
- <points that held as disagreements even after R2>

## Anchoring watch ⚠️
<Note if R2 responses converged heavily toward one R1 — flag if consensus looks like anchoring rather than genuine agreement>

## Recommendation
<Lex's synthesis — weight R2 positions more heavily than R1>
```

### Output structure for `--collab`

```
docs/council-sessions/YYYY-MM-DD-<slug>/
  question.md       — the question
  opus.md           — Opus R1
  gemini.md         — Gemini R1
  gpt54.md          — GPT-5.4 R1
  kimi.md           — Kimi K2.5 R1
  opus-r2.md        — Opus R2 (after seeing others)
  gemini-r2.md      — Gemini R2
  gpt54-r2.md       — GPT-5.4 R2
  kimi-r2.md        — Kimi K2.5 R2
  synthesis.md      — final synthesis with shift analysis
```

---

## FOLLOW-UP — `/council follow-up <advisor> <question>`

Continue a conversation with a specific advisor from the most recent council session.

### Usage
```
/council follow-up opus "What about the edge case where..."
/council follow-up gemini "Can you elaborate on your point about..."
/council follow-up gpt "How would you implement the approach you suggested?"
/council follow-up kimi "Push harder on that critique — what's the worst case?"
```

### How each advisor resumes

| Advisor | Resume Method |
|---------|--------------|
| **Opus (Claude)** | `claude --resume` flag — continues the same session |
| **Gemini** | `gemini --resume <idx>` — resumes conversation by session index |
| **GPT-5.4 (Codex)** | `codex resume` subcommand — picks up prior context |
| **Kimi K2.5** | Message history array in API call — pass prior messages + new question |

### Shared context
Follow-ups should include a summary of OTHER advisors' prior responses so the advisor can react to the full council discussion, not just their own prior response. Format:

```
## Context from other advisors

**Opus said:** <1-2 sentence summary>
**Gemini said:** <1-2 sentence summary>
**GPT-5.4 said:** <1-2 sentence summary>
**Kimi said:** <1-2 sentence summary>

## Follow-up question
<the user's question>
```

### Implementation
1. Read the most recent `docs/council-sessions/YYYY-MM-DD-<slug>/` directory
2. Load all 4 advisor response files
3. Build the shared context summary
4. Call the specified advisor with: prior response + shared context + new question
5. Write the follow-up response to `docs/council-sessions/.../followup-<advisor>-<N>.md`
6. Present the response to the user

### Kimi follow-up specifics
Kimi uses the Moonshot API with message history. Build the messages array:
```json
{
  "model": "kimi-k2.5",
  "messages": [
    {"role": "user", "content": "<original council question>"},
    {"role": "assistant", "content": "<kimi's original response>"},
    {"role": "user", "content": "<shared context + follow-up question>"}
  ],
  "temperature": 1
}
```
CRITICAL: temperature=1 only. Account is on Tier2 (100 concurrent, 500 RPM) — can run in parallel with other advisors.

---

## COST

~$0 — Opus, Gemini, GPT-5.4 use subscription CLIs (Max plan, Google AI Pro, ChatGPT Business).
Kimi K2.5 uses Moonshot API (pay-per-use, ~$0.02/call). Negligible cost.
