---
name: council
description: >
  3-model council — ask Opus, Gemini, and GPT-5.4 the same question in parallel,
  save responses to persistent files, synthesize consensus.
  Use when user says 'ask the council', 'get 3 opinions', 'council on', 'what do all 3 think',
  'multi-model opinion', or wants strategic input from multiple LLMs before making a decision.
  Use: "/council <question>" or "/council" (reads question from conversation context).
allowed-tools: Bash, Read, Write, Agent, Glob
user-invocable: true
metadata:
  version: "1.0.0"
  author: emmanuel
  filePattern: "docs/council-sessions/**"
---

# Council — 3-Model Strategic Advisory

Ask the same question to Claude Opus, Gemini 2.5 Pro, and GPT-5.4 in parallel.
Each advisor writes their response directly to a persistent file. Lex synthesizes.

## IMMEDIATE ACTION

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

   **CRITICAL RULES:**
   - Each agent MUST write to the output file using Write tool — NOT stdout
   - Use `mode: "bypassPermissions"` so agents can write without prompts
   - Use `model: "haiku"` for the agent wrapper (the real LLM call is inside callLLMWithMetadata)
   - All 3 MUST run in parallel (single message with 3 Agent tool calls)
   - Set `run_in_background: false` — wait for all 3 to complete

6. **Verify all 3 responses exist:**
   Check file sizes. If any response is empty or <100 chars, note the failure.

7. **Synthesize:**
   Read all 3 response files. Write `synthesis.md` containing:

   ```markdown
   # Council Synthesis — <date>

   ## Question
   <the question>

   ## Consensus (agreed by 2/3 or 3/3)
   - <point 1>
   - <point 2>
   ...

   ## Disagreements
   | Topic | Opus | Gemini | GPT-5.4 |
   |-------|------|--------|---------|
   | ... | ... | ... | ... |

   ## Recommendation
   <Lex's synthesis based on all 3 inputs + own judgment>

   ## Advisors
   - Opus: <one-line summary of their position>
   - Gemini: <one-line summary>
   - GPT-5.4: <one-line summary>
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
  gemini.md        — Gemini 2.5 Pro response
  gpt54.md         — GPT-5.4 response
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

## COST

$0 — all 3 models use subscription CLIs (Max plan, Google AI Pro, ChatGPT Business).
No API keys consumed.
