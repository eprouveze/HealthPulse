---
name: web-scout
description: >
  Surgical live-web search via Perplexity Sonar API. Use when user says 'search the web for',
  'look up this error', 'check latest docs for', 'what changed in [library] recently', or needs
  quick, targeted web lookups. For fetching current
  documentation, recent breaking changes, or specific error codes NOT in
  Claude's training data. THIS COSTS REAL MONEY — $5/month API credit.
  Use as a sniper rifle, never a machine gun.
allowed-tools: Bash, Read
user-invocable: true
metadata:
  version: "1.0.0"
  author: emmanuel
---

# Live Web Search (Perplexity Sonar API)

You are the Lead Engineer. You have access to the Perplexity API to search the live internet for information beyond your training data.

## CRITICAL BUDGET RULES

Unlike Gemini CLI (free, flat-rate) and Codex CLI (free, flat-rate), **this API costs hard currency per token.** The user has $5/month in API credit. A single careless query can burn $0.50+.

### You MUST obey these rules:

1. **NEVER use this for general knowledge.** If Claude already knows the answer (even approximately), do NOT verify it with Perplexity. Trust your training data.
2. **NEVER pass code blocks, file contents, or large context** into the query. Queries must be short — under 100 words.
3. **NEVER retry on failure.** If the API returns an error (401, 429, 500, timeout), stop. Make your best guess from training data. Log the failure and move on.
4. **NEVER use in a loop.** One query per knowledge gap. No "let me try a different phrasing" — that's two queries.
5. **NEVER use for research that WebSearch can handle.** The built-in WebSearch tool is free. Only use Perplexity when you need search-grounded synthesis (not just links).

### Valid use cases (sniper shots):
- "What breaking changes did Next.js 15.2 introduce for App Router caching?" — specific, time-sensitive
- "Stripe API 2026-03 changelog: what changed in checkout sessions?" — can't find in training data
- "Supabase pg_net extension: how to make async HTTP calls from triggers?" — niche technical docs
- "Error: NEXT_REDIRECT_ERROR in server component after Next.js upgrade" — specific error code

### Invalid use cases (machine gun — DO NOT USE):
- "How does React work?" — Claude knows this
- "Best practices for TypeScript" — Claude knows this
- "Explain this code: [500 lines of code]" — too expensive, Claude can analyze code natively
- "What is Supabase?" — Claude knows this
- General market research — use WebSearch instead

## Multi-LLM Mode Check

1. Read `.claude/llm-mode.json` — if `mode` is `"multi"`, Perplexity is available
2. If `mode` is `"single"` or file doesn't exist, use WebSearch or your training data instead
3. Even in multi mode, apply all budget rules above

## IMMEDIATE ACTION

### Step 1: Qualify the Query

Before making ANY API call, answer these three questions:

1. **Do I already know this?** If yes → stop, use training data
2. **Can WebSearch answer this?** If yes → use WebSearch (free)
3. **Is this specific and time-sensitive enough to justify $0.10-0.50?** If no → stop

Only proceed if all three answers point to Perplexity.

### Step 2: Formulate the Query

Write the **shortest possible query** that will get you the answer. Aim for 10-30 words.

**Good:** "Next.js 15 App Router caching breaking changes 2026"
**Bad:** "I am building a Next.js application and I noticed that after upgrading to version 15 the caching behavior seems different from what I expected based on the documentation for version 14, can you help me understand what changed and how to migrate my existing cache configuration?"

### Step 3: Execute the API Call

```bash
START_TIME=$(date +%s)
PPLX_RESPONSE=$(curl -s --max-time 15 \
  --request POST \
  --url https://api.perplexity.ai/chat/completions \
  --header "Authorization: Bearer $PERPLEXITY_API_KEY" \
  --header "Content-Type: application/json" \
  --data "{
    \"model\": \"sonar-pro\",
    \"messages\": [
      {
        \"role\": \"system\",
        \"content\": \"You are a senior developer. Search the web and return a concise, factual answer with code snippets if relevant. Cite your sources. No conversational filler.\"
      },
      {
        \"role\": \"user\",
        \"content\": \"[YOUR_SHORT_QUERY]\"
      }
    ],
    \"max_tokens\": 1000,
    \"temperature\": 0.1
  }" 2>/dev/null)
PPLX_EXIT=$?
DURATION=$(($(date +%s) - START_TIME))

echo "$PPLX_RESPONSE"
```

**Hardcoded safety limits:**
- `max_tokens: 1000` — caps response cost regardless of how much Perplexity finds
- `temperature: 0.1` — factual, not creative
- `--max-time 15` — timeout after 15 seconds (prevents hanging)
- `sonar-pro` — search-grounded model with citations

### Step 4: Parse and Validate

Check the response:

```bash
# Check for API errors
echo "$PPLX_RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'error' in d:
        print(f'API_ERROR: {d[\"error\"].get(\"message\", \"unknown\")}')
    elif 'choices' in d:
        msg = d['choices'][0]['message']['content']
        print(msg)
        # Print citations if available
        citations = d.get('citations', [])
        if citations:
            print('\n--- Sources ---')
            for i, c in enumerate(citations, 1):
                print(f'{i}. {c}')
    else:
        print('UNEXPECTED_FORMAT')
except:
    print('PARSE_ERROR')
" 2>/dev/null
```

**On any error (API_ERROR, PARSE_ERROR, timeout, non-zero exit code):**
- Do NOT retry. Log the failure and fall back to training data or WebSearch.

### Step 5: Log the Query

**Always log**, even on failure. This tracks API credit consumption.

Append to `.claude/delegation.log`:
```
YYYY-MM-DDTHH:MM:SSZ | web-scout | ok | Ns | Query: [short query summary]
```

Then update stats:
```bash
python3 -c "
import json, datetime
f='.claude/llm-mode.json'
try:
  with open(f) as fh: d=json.load(fh)
  d['stats']['delegations_total'] = d['stats'].get('delegations_total',0) + 1
  d['stats']['last_delegation'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
  with open(f,'w') as fh: json.dump(d, fh, indent=2)
except: pass
"
```

Or on failure:
```
YYYY-MM-DDTHH:MM:SSZ | web-scout | fail | Ns | [error type]: [short description]
```

Then update stats:
```bash
python3 -c "
import json, datetime
f='.claude/llm-mode.json'
try:
  with open(f) as fh: d=json.load(fh)
  d['stats']['delegations_failed'] = d['stats'].get('delegations_failed',0) + 1
  d['stats']['last_delegation'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
  with open(f,'w') as fh: json.dump(d, fh, indent=2)
except: pass
"
```

### Step 6: Apply the Knowledge

Read the response and apply it to the current task. Do NOT include raw Perplexity output in user-facing deliverables — synthesize it into your own analysis.

## Cost Estimation

| Query Type | Estimated Cost |
|-----------|---------------|
| Short factual query (10-20 words) | $0.05-0.10 |
| Technical query with code response | $0.10-0.25 |
| Complex multi-source synthesis | $0.25-0.50 |
| **Monthly budget** | **$5.00** |
| **Safe queries per month** | **~20-50** |
| **Queries per session (guideline)** | **0-2** |

## Integration Points

- **With `/plan` Phase 1.5:** When external research is needed for high-risk topics (security, payments, new framework features), `/web-scout` provides current info
- **With `/brief`:** When briefing surface competitive intel or market data that's more recent than training data
- **With `/codex-write`:** Before delegating to Codex, if the task uses a library/API that may have changed since training data

## Troubleshooting

**401 Unauthorized:**
- API key is expired or invalid. User needs to regenerate at https://www.perplexity.ai/settings/api
- Do NOT retry. Fall back to WebSearch.

**429 Rate Limited:**
- Monthly credit exhausted. Do NOT retry until next billing cycle.
- Fall back to WebSearch for the rest of the month.

**Empty or irrelevant response:**
- Query was too vague. Do NOT retry with a "better" query — that's two queries.
- Use your training data or WebSearch instead.

**$5 credit running low:**
- Reduce to 0-1 queries per session
- Prefer WebSearch for everything except truly critical, time-sensitive lookups
