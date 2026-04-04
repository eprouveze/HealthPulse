---
name: model-scan
description: >
  Scan LLM provider APIs for available models, fetch official docs for specs (params, context windows, capabilities, pricing),
  save timestamped doc snapshots, and optionally update CLAUDE.md. Use when the user asks about current models or wants to refresh the model list.
  Also use when user says 'scan models', 'refresh models', 'what models are available', 'update model table', 'model pricing', 'check model IDs', or 'are these model IDs current'.
allowed-tools: Bash, Read, Edit, Glob, Grep, WebFetch, WebSearch, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
user-invocable: true
---

# Model Scan

Query all configured LLM provider APIs, fetch official documentation for specs, and produce a comprehensive model report.

## APPROVAL GATE — Curated Table Changes

The CLAUDE.md "Current AI Model IDs" table is a **curated selection** that directly affects which models are used in production code. **Any changes to the recommended models in this table require explicit user approval.** The script auto-updates the table from its `selectRecommendedModels()` list, but if you detect that the recommended set should change (new model added, model removed, provider added/dropped), you MUST:
1. Show the user what changed and why
2. Wait for explicit approval before writing to CLAUDE.md
3. Never silently add or remove providers from the curated table

## IMMEDIATE ACTION — Route by Argument

**When this skill is invoked, check the argument first:**

- **`/model-scan`** (no args) → Run the script with `--update-claude-md`, display results, then **review saved docs for TBD fields** (see Phase 2 below)
- **`/model-scan list`** → Run the script without `--update-claude-md`, display results only
- **`/model-scan fast`** → Run with `--skip-docs --update-claude-md` (uses cached docs, faster)

### Phase 1: Run the scanner

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsx ~/.claude/scripts/model-scan.ts --update-claude-md
```

> **Important:** The script lives at `~/.claude/scripts/model-scan.ts` (global). It works from any project directory and tries multiple `.env` locations for API keys.

### Phase 2: Fill TBD fields using Context7 + saved docs

After the script completes, check the output for models with "TBD" fields. Use **Context7** as the primary source — it has pre-rendered, indexed provider docs that bypass Cloudflare/JS-rendering issues.

#### Steps for each TBD:

1. **Search Context7 dynamically** — use `resolve-library-id` to find the provider's docs (search for "openai", "anthropic", "gemini", etc.), then `query-docs` with the model ID and what's missing. Context7 indexes pre-rendered docs that bypass Cloudflare/JS issues. Library IDs change over time — always resolve first, never hardcode them.
2. **If Context7 doesn't have it**, use `WebSearch` to find the model's spec page, then `WebFetch` to extract data.
3. **Check saved doc snapshots** in `docs/briefings/model-scan/docs/YYYY-MM-DD/` as a fallback source.
4. **Update the fallback tables** in `~/.claude/scripts/model-scan.ts` with verified values so future runs have them.
5. **Re-run the script** if you made fallback updates, to produce a clean report.

> **Important:** Codex variants (e.g. `gpt-5.3-codex`) are **distinct models** from their base (e.g. `gpt-5.3`) — different training, pricing, and capabilities. Do not assume they share specs. Look up each one individually.

> **Tip:** Query Context7 and WebSearch in parallel for multiple models/providers.

### Phase 3: Summarize

After the script completes, summarize:
1. How many models were found across how many providers
2. Any providers that were skipped (missing API keys)
3. Any remaining TBD fields (could not be resolved)
4. Where data came from per model (the `data_sources` field shows: `api`, `docs:pricing`, `docs:context`, `docs:params`, etc.)
5. If `--update-claude-md` was used, confirm the update

## What It Does

### Per-run documentation fetch

The script fetches each provider's official docs pages on every run and saves them as timestamped text snapshots:

- `docs/briefings/model-scan/docs/YYYY-MM-DD/openai-models.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/openai-chat-api.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/anthropic-models.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/anthropic-messages-api.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/gemini-models.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/gemini-pricing.txt` (plain markdown — no JS rendering issues)
- `docs/briefings/model-scan/docs/YYYY-MM-DD/perplexity-models.txt`
- `docs/briefings/model-scan/docs/YYYY-MM-DD/perplexity-chat-api.txt`

Use `--skip-docs` to reuse the most recent cached snapshot instead of re-fetching.

### Data extraction pipeline

For each model, data is merged from multiple sources (in priority order):

1. **Provider API** — model list, and for Gemini: context window, temperature, topP, topK directly from the API
2. **Parsed docs** — the script uses regex patterns to extract context windows, max output tokens, pricing, temperature ranges, capabilities, and knowledge cutoffs from the saved doc text
3. **Context7** (Phase 2) — pre-rendered, indexed provider docs queried via MCP tool. Solves Cloudflare/JS-rendering issues. Returns structured APIDOC blocks with exact specs per model.
4. **Fallback table** — `FALLBACK_PRICING` in the script provides last-known-good pricing when docs parsing fails

Each model's `data_sources` field tracks exactly where each piece of data came from.

### Providers

1. **OpenAI** — `GET /v1/models` + fetches `platform.openai.com/docs/models` and `/docs/api-reference/chat/create`
2. **Anthropic** — `GET /v1/models` + fetches `docs.anthropic.com/en/docs/about-claude/models` and `/en/api/messages`
3. **Gemini** — `GET /v1beta/models` (rich metadata: context, params) + fetches `ai.google.dev/gemini-api/docs/models`
4. **Perplexity** — Hardcoded model list + fetches `docs.perplexity.ai/guides/model-cards` and `/api-reference/chat-completions`

### Fields collected per model

| Field | Sources |
|-------|---------|
| **Model ID** | API |
| **Pricing** (input/output per 1M tokens) | Docs parsing → Fallback table |
| **Context window** (max input tokens) | API (Gemini) → Docs parsing |
| **Max output tokens** | API (Gemini) → Docs parsing |
| **Capabilities** (vision, tool_use, structured_output, json_mode, streaming, extended_thinking, search_grounding, code_execution, pdf_input, image_generation) | Docs parsing → API (Gemini) |
| **Params** (temperature, top_p, top_k ranges/defaults) | API (Gemini) → Docs parsing |
| **Knowledge cutoff** | Docs parsing |
| **Docs URL** | Per-provider |

## Output

- **Console** — Table with pricing, context, params, capabilities, data sources, and TBD warnings
- **JSON** — `docs/briefings/model-scan/YYYY-MM-DD.json` (full structured data)
- **Docs** — `docs/briefings/model-scan/docs/YYYY-MM-DD/*.txt` (timestamped provider doc snapshots)
- **CLAUDE.md** — Updates the "Current AI Model IDs" table (when `--update-claude-md` flag is used)

## Staleness Rule

**Any skill or script that references an LLM model ID should check the latest scan first.** If the most recent JSON in `docs/briefings/model-scan/` is more than 7 days old, run `/model-scan` to refresh before using any model IDs. Models and pricing change frequently — never rely on stale data or guess model IDs from marketing names.

## Updating Fallback Data

The `FALLBACK_PRICING` table in `~/.claude/scripts/model-scan.ts` provides last-known-good pricing for when docs parsing fails. Update it when:
- New models appear with "pricing TBD" and you've verified the price from the saved docs or provider website
- Pricing changes are announced

The doc URLs in `DOCS_PAGES` should be updated if providers change their docs structure.
