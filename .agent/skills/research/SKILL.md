---
name: research
description: >
  External web research tool. Use when user says 'research this', 'look this up online',
  'what does the web say about', 'find recent info on', 'competitive analysis', or needs deep
  multi-source web research. Delegates deep research queries to Gemini CLI (free,
  2.5 Pro, has live web search). Unlike /web-scout (expensive Perplexity sniper),
  this is for comprehensive research reports — competitor analysis, API docs,
  SEO strategies, market research, technical best practices. Always uses Gemini
  regardless of multi/single LLM mode. Falls back to built-in WebSearch if Gemini
  CLI is unavailable.
allowed-tools: Bash, Read, WebSearch
user-invocable: true
metadata:
  version: "1.0.0"
  author: emmanuel
---

# External Research Tool

You are a research analyst. Your job is to search the live web and produce a
**comprehensive, structured research report** with real findings and sources.

This is the external counterpart to `/brief`:
- `/brief` → reads INTERNAL docs, surfaces constraints and context
- `/research` → searches the EXTERNAL web, surfaces new knowledge and opportunities

## When to Use

```
/research what are the most recent Remotion Lambda pricing and limits in 2026?
/research best SEO lead gen strategies for AI productivity tools in 2026
/research how do competitors like Gamma and Beautiful.ai handle animation?
/research Next.js 15 breaking changes for App Router projects
```

**Good for:**
- Competitive intelligence and market research
- API / library documentation (new versions, breaking changes)
- SEO strategies, growth tactics, industry trends
- Technical best practices for tools we use (Next.js, Supabase, Stripe, Remotion, etc.)
- Anything requiring live internet knowledge beyond Claude's training data

**Not for:**
- Internal questions about our codebase → use `/brief` or just ask Claude
- Specific niche error codes with no context → use `/web-scout` (Perplexity)
- Simple questions Claude already knows → just ask

---

## IMMEDIATE ACTION

### Step 1: Parse the Research Query

Extract from the user's message:
1. **The research question** — what to look up
2. **Project context flag** — does the query say "our project", "for us", "we use",
   "our stack", "our app"? If yes → inject project context (see Step 2)
3. **Depth** — default is `standard`. If the user says "deep dive", "thorough", or
   "comprehensive" → set to `deep` (longer prompt, ask Gemini for more detail)

### Step 2: Build Project Context (if needed)

If the query references "our project" or needs project context, extract a compact
summary from CLAUDE.md. **Do not pass CLAUDE.md itself to Gemini** — it's too large
and includes internal patterns Gemini doesn't need. Instead build a focused context
block:

```
**Project Context:**
Product: FluxDiagram — a Next.js SaaS that generates professional animated diagrams
and visuals for embedding in slides (Google Slides, PowerPoint, Keynote). Users
describe what they want; FluxDiagram generates animated content (browser preview via
Remotion Player for free tier, Remotion Lambda for video export GIF/MP4/WebM).

Tech stack: Next.js (Vercel), Supabase (Postgres + Auth), Stripe, Remotion (React-based
animation engine), Resend (email), PostHog (analytics), Cloudflare R2 (storage).
AI models: GPT-5 Nano/Mini (Standard animations, ~$0.036/ea), Claude Sonnet 4.5/Gemini
3 Pro (Premium animations, ~$0.25/ea).

Business model: Freemium SaaS. Free: 5 standard animations/mo, watermarked, 720p.
Starter $14/mo: 25 standard + 5 premium, 5 exports, 1080p. Pro $29/mo: 75 standard +
25 premium, 25 exports, 4K, API access. Target: presentation makers across business,
education, sales, marketing. Bootstrap model, no VC.

Domains: fluxdiagram.com (SEO/marketing), fluxdiagram.app (web app), fluxdiagram.dev (API).
```

Only inject this context when the query requires it. For generic external research
(e.g., "Remotion Lambda pricing"), skip it — it just adds noise.

### Step 3: Formulate the Research Prompt

Build the Gemini prompt. Structure:

**For queries WITH project context:**
```
[PROJECT CONTEXT BLOCK]

Research Question: [USER'S QUERY]

Search the web and return a comprehensive research report that:
1. Answers the research question with current, factual information (2025-2026)
2. Highlights findings most relevant to the project described above
3. Includes specific, actionable recommendations tailored to our context
4. Cites real sources (article titles and URLs, not just search query URLs)
5. Flags anything that might conflict with our current approach

Output raw markdown. Lead with the most important findings.
```

**For queries WITHOUT project context:**
```
Research Question: [USER'S QUERY]

Search the web and return a comprehensive research report that:
1. Covers current best practices and recent developments (2025-2026)
2. Includes specific, concrete findings with examples
3. Cites real sources with actual URLs (article titles + links)
4. Is structured for a technical/product audience

Output raw markdown. Lead with the most important findings.
```

### Step 4: Execute Gemini CLI

```bash
START_TIME=$(date +%s)
RESEARCH_OUTPUT=$(echo "[YOUR PROMPT HERE]" | \
  gemini -m gemini-2.5-pro \
  -p "You are a professional research analyst with live web access. Search the web thoroughly, synthesize findings from multiple sources, and return a well-structured research report in markdown. Include real article/page URLs as sources — not Google search query URLs." \
  -o text 2>/dev/null)
GEMINI_EXIT=$?
DURATION=$(($(date +%s) - START_TIME))
```

**Check success:**
```bash
if [ $GEMINI_EXIT -ne 0 ] || [ -z "$RESEARCH_OUTPUT" ]; then
  echo "GEMINI_FAILED"
fi
```

**Timeout guidance:** Gemini research takes 60-180 seconds depending on depth.
This is expected — do NOT kill the process early. Inform the user that research
is in progress if they seem impatient.

### Step 5: Post-Process the Report

Before presenting, quickly scan the output for quality issues:

1. **Source quality check** — if all sources are `google.com/search?q=...` URLs
   (not real articles), flag this in the report header:
   `> Note: Gemini returned search query URLs as sources rather than direct article links.`
   Then run a WebSearch fallback to surface 3-5 real source URLs on the topic and
   append them.

2. **Relevance check** — does the report actually answer the question asked?
   If Gemini went off on a tangent, note this and add a short synthesis from your
   own knowledge to fill the gap.

3. **Context alignment** — if project context was injected, verify the
   recommendations actually apply to our tech stack and business model. Flag any
   recommendations that don't fit (e.g., "integrate with Lottie" when Lottie is
   invalidated for our use case).

### Step 6: Log the Research

Append to `.claude/delegation.log`:
```bash
echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | research | ok | ${DURATION}s | Gemini: [short topic]" >> .claude/delegation.log
```

On failure (fallback to WebSearch):
```bash
echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | research | fallback | ${DURATION}s | Gemini failed → WebSearch for: [topic]" >> .claude/delegation.log
```

### Step 7: Present the Report

Present the full research report to the user. Add a brief header if useful:

```
## Research Report: [Topic]
*Source: Gemini 2.5 Pro live web search · [date] · ~[N]s*

[report body]
```

Then ask: "Anything you'd like me to dig deeper on, or shall I apply these
findings to a specific task?"

---

## Fallback: WebSearch

If Gemini CLI is not available (`which gemini` returns nothing) or fails:

1. Use the built-in `WebSearch` tool to run 2-3 targeted searches
2. Synthesize findings into a research report format
3. Note in the header: `*Source: Claude WebSearch (Gemini CLI unavailable)*`

Do NOT fall back to Perplexity — the API credit may be exhausted.

---

## Key Differences from Sibling Skills

| Skill | Source | Cost | Use Case |
|-------|--------|------|----------|
| `/brief` | Internal docs | Free | Pre-task, surfaces constraints |
| `/research` | Live web (Gemini) | Free | External research, market intel |
| `/web-scout` | Perplexity API | $0.10-0.50/query | Targeted niche queries, specific error codes |

---

## Examples

**Example 1: Tech research with project context**
```
/research what are the most recent Remotion Lambda pricing, limits, and API
changes in 2026 that affect our animation export pipeline?
```
→ Inject project context, ask Gemini to search Remotion docs and announcements,
focus on what's relevant to our Lambda rendering stack.

**Example 2: Market research without context**
```
/research best practices for SEO-based lead generation for B2C SaaS in 2026
```
→ No project context needed. Gemini searches for current SEO/content strategies.

**Example 3: Competitive intelligence**
```
/research how do animated presentation tools like Gamma, Beautiful.ai, and
Canva approach AI-generated animations?
```
→ Inject project context for relevance. Gemini searches competitor features,
pricing, positioning. Report includes comparison vs our approach.

**Example 4: Library/API docs**
```
/research Next.js 15 breaking changes and migration guide from version 14
```
→ No project context (generic technical research). Quick depth mode.

---

## Troubleshooting

**Gemini produces Google search URLs instead of real sources:**
Use the WebSearch tool to find 3-5 real articles on the topic. Append these as
an "Additional Sources" section at the bottom of the report.

**Report is too generic (doesn't apply to our project):**
Re-run with more explicit project context. Add a sentence at the start of the
context block: "Focus specifically on how the findings apply to our Remotion-based
animation stack and freemium SaaS business model."

**Gemini times out or errors:**
Fall back to 2-3 WebSearch queries. Synthesize manually. Note the fallback in the report header.

**Research takes too long:**
Normal — Gemini 2.5 Pro with web search can take 90-180 seconds for complex
research. Do not interrupt. Use this time to read back any existing `/brief`
output or check if there are relevant internal docs.
