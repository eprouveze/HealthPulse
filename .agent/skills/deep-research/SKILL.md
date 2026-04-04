---
name: deep-research
description: >
  Run Perplexity Deep Research via Playwright browser automation. Uses Pro subscription credits (FREE),
  not API credits. Use when you need comprehensive, cited web research on any topic. Trigger on
  'deep research', 'research this thoroughly', 'I need a deep dive on', 'use perplexity to research'.
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_snapshot, mcp__playwright__browser_wait_for, mcp__playwright__browser_press_key, mcp__playwright__browser_evaluate, mcp__playwright__browser_close, mcp__playwright__browser_fill_form, mcp__playwright_headless__browser_navigate, mcp__playwright_headless__browser_click, mcp__playwright_headless__browser_type, mcp__playwright_headless__browser_snapshot, mcp__playwright_headless__browser_wait_for, mcp__playwright_headless__browser_press_key, mcp__playwright_headless__browser_evaluate, mcp__playwright_headless__browser_close, mcp__playwright_headless__browser_fill_form, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_type, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_press_key, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_close, mcp__plugin_playwright_playwright__browser_fill_form, Write, Read, Bash
user-invocable: true
---

# Perplexity Deep Research via Playwright

Run Deep Research queries through the Perplexity Pro web UI using Playwright browser automation.
This uses **Pro subscription credits** (4,000 bonus, expiring Apr 13 2026) — NOT API credits ($10 balance).

## Cost

- **$0 per query** — uses Pro plan credits, not API
- Budget: 4,000 credits available, ~5-10 per Deep Research query
- No conservation needed — burn freely before expiry

## Browser Setup

Three Playwright MCP servers are available. Prefer in this order:
1. `mcp__playwright_headless__*` — headless with persistent profile at `~/.playwright-profile` (ideal for automation)
2. `mcp__plugin_playwright_playwright__*` — plugin-managed (headed, good for debugging)
3. `mcp__playwright__*` — standalone (headed)

## Prerequisites

- User must have logged into perplexity.ai in the Playwright browser at least once (cookies persist in `~/.playwright-profile`)
- **First-time login**: Use the headed plugin browser (`mcp__plugin_playwright_playwright__browser_navigate`) to navigate to perplexity.ai. Ask user to log in. Cookies will be saved.
- **Subsequent runs**: Use headless (`mcp__playwright_headless__*`) — login cookies persist across sessions
- If login expired, fall back to headed mode for re-login

## Execution Steps

### Step 1: Navigate to Perplexity

```
mcp__playwright__browser_navigate → https://www.perplexity.ai
```

### Step 2: Verify logged in

Take a snapshot. Look for the user avatar button (contains username). If you see a "Sign in" prompt instead, tell the user to log in manually.

### Step 3: Activate Deep Research mode

**IMPORTANT**: Deep Research mode resets on every page navigation. You MUST re-activate it before EVERY query, even if it was active on the previous query. Navigating to perplexity.ai or any other page resets the mode to default search.

1. Click the search textbox (the main input area, `#ask-input` or the active textbox)
2. Type `/` slowly (one character) — this opens the search mode menu
3. Look for the "Deep research" menuitem in the typeahead menu
4. Click it — the UI will show a "Deep research" button/indicator replacing the default controls

**For batch queries**: Instead of navigating to perplexity.ai between queries, use the "New thread" button (Cmd+K) to start a fresh thread without leaving the page. Then re-activate Deep Research mode with the `/` → menu flow.

### Step 4: Type the query

After Deep Research mode is activated, the textbox should be ready. Type the full research query.

### Step 5: Submit

Press Enter or click the Submit button.

### Step 6: Wait for completion

Deep Research takes 30-180 seconds. It goes through multiple phases:
- "Searching..." / "Reading sources..."
- "Analyzing..." / "Writing report..."
- Final report appears

**Polling strategy:**
- Wait 15 seconds initially
- Then snapshot every 15-20 seconds to check progress
- Look for signs of completion: the response text stops growing, a "Copy" or "Share" button appears, or the streaming indicator disappears
- Maximum wait: 5 minutes (if still running after 5 min, extract whatever is available)

```
mcp__playwright__browser_wait_for → timeout 15000
mcp__playwright__browser_snapshot → check for completion indicators
```

### Step 7: Extract the result

Use `browser_evaluate` to extract the response content:

```javascript
// Extract the last assistant message content as text
const articles = document.querySelectorAll('[class*="prose"], [class*="markdown"], article');
const lastArticle = articles[articles.length - 1];
return lastArticle ? lastArticle.innerText : document.querySelector('main')?.innerText || 'EXTRACTION_FAILED';
```

If that fails, try:
```javascript
// Fallback: get all text from the response area
const responseArea = document.querySelector('[class*="response"], [class*="answer"], [data-testid*="response"]');
return responseArea ? responseArea.innerText : '';
```

If both fail, take a screenshot and use the snapshot text content.

### Step 8: Save the result

Save the extracted content to the requested output location, or return it to the caller.

Default save location: `docs/research/perplexity-deep-research-YYYY-MM-DD-<slug>.md`

Format:
```markdown
---
source: perplexity-deep-research
query: "<the original query>"
date: YYYY-MM-DD
credits_used: ~5-10
---

# <Title derived from query>

<extracted content>
```

### Step 9: Close the tab (optional)

If running multiple queries, navigate to a new thread instead of closing:
- Click "New thread" button or press Cmd+K

## Batch Mode

For multiple queries (e.g., inbox enrichment), loop through:
1. Run query 1 → extract → save
2. Click "New thread" (Cmd+K)
3. Run query 2 → extract → save
4. Repeat

## Troubleshooting

- **Not logged in**: Ask user to run the skill once in headed mode to log in
- **Deep Research not available**: Check if Pro plan is active (look for "Pro" badge)
- **Extraction fails**: Fall back to `browser_snapshot` and parse the YAML tree
- **Rate limited**: Wait 60 seconds between queries if hitting limits
- **Cookie expired**: Navigate to perplexity.ai, check if redirected to login

## Example Usage

```
/deep-research What are the top competitors to MyWritingTwin in the AI writing voice profiling space? Include pricing, features, and market positioning.
```

```
/deep-research Comprehensive analysis of the WordPress plugin ecosystem for AI-powered writing tools. Market size, top plugins by installs, pricing models, and gaps.
```
