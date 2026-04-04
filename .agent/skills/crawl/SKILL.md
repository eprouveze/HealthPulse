---
name: crawl
description: >
  Fetch web pages with JS rendering support via Cloudflare Browser Rendering.
  Use when WebFetch returns 403, when pages are JS-rendered SPAs, or when you need
  reliable markdown extraction from any URL. Use when user says 'crawl this page',
  'fetch this URL', 'scrape this site', 'get the content from this page',
  'this page is blocked', or when WebFetch fails on a URL.
allowed-tools: Bash, Read, Write
user-invocable: true
---

# /crawl — Tiered Web Page Fetcher

Shared utility for fetching web pages that may be JS-rendered or Cloudflare-protected. Uses Cloudflare Browser Rendering as the rendering engine.

## Usage

### From CLI (any skill or script can call this)

```bash
# Single URL → markdown to stdout
npx tsx ~/.claude/scripts/crawl.ts "https://example.com"

# Save to file
npx tsx ~/.claude/scripts/crawl.ts "https://example.com" --save /tmp/output.md

# Get HTML instead of markdown
npx tsx ~/.claude/scripts/crawl.ts "https://example.com" --format html

# Skip direct fetch, go straight to Cloudflare Browser Rendering
npx tsx ~/.claude/scripts/crawl.ts "https://example.com" --tier cf

# Batch mode (one URL per line in file)
npx tsx ~/.claude/scripts/crawl.ts --batch urls.txt --save /tmp/output/

# JSON output (for scripting)
npx tsx ~/.claude/scripts/crawl.ts "https://example.com" --json
```

### From TypeScript (import in other scripts like model-scan.ts)

```typescript
import { crawl } from "~/.claude/scripts/crawl.ts";

const result = await crawl("https://example.com", { format: "markdown" });
if (result.content && !result.error) {
  // Use result.content (markdown string)
} else {
  // Handle error: result.error, result.blocked
}
```

## How It Works

**Cloudflare Browser Rendering is the default.** This skill exists to USE the CF crawl API — a managed headless browser that renders JS, handles redirects, and returns clean markdown.

1. **Default: CF Browser Rendering** — renders JS, bypasses most WAFs, handles HTTP/HTTPS, returns markdown
2. **Fallback: Direct fetch** — if CF fails, tries a simple HTTP fetch (useful for `.md.txt` endpoints or when CF is rate-limited)
3. **If both fail** — the caller decides the next step (Context7, WebSearch, cached docs, etc.)

Use `--tier direct` only when you explicitly want to skip CF (e.g., fetching a known `.md.txt` endpoint).

### What Each Tier Handles

| Scenario | Direct | CF Browser Rendering |
|----------|--------|---------------------|
| Static HTML pages | works | works |
| Perplexity pages | 403 | works |
| JS SPA (React/Vue) | "Loading..." | works (renders JS) |
| OpenAI docs | 403 | blocked (WAF blocks CF IPs too) |
| Anthropic docs | partial (SPA) | partial (needs wait time) |
| `.md.txt` endpoints | works | works |

### Known Limitations

- **OpenAI docs** block even Cloudflare's rendering IPs. For OpenAI, use Context7 or the OpenAI Python SDK README on GitHub as alternatives.
- **Heavy JS SPAs** (Anthropic docs) may return "Loading..." even from CF if the page needs >5s to hydrate. Use Context7 as fallback for these.
- **Rate limits**: CF Browser Rendering has account-level limits. Don't crawl hundreds of pages in tight loops.

## Environment Variables

| Variable | Required | Location |
|----------|----------|----------|
| `CLOUDFLARE_BR_TOKEN` | Yes (for Tier 2) | `~/.env` |
| `CLOUDFLARE_ACCOUNT_ID` | Yes (for Tier 2) | `~/.env` |

Token created at https://dash.cloudflare.com/profile/api-tokens with "Account > Browser Rendering > Edit" permission. The token is permanent (no expiration).

## Integration with Other Skills

- **`/model-scan`**: Uses `/crawl` for fetching provider doc pages (replaces raw `fetch()` in `fetchAndSaveDocs()`)
- **`/geo`**: Uses `/crawl` for fetching competitor pages and audit targets
- **Inbox enrichment**: Uses `/crawl` for fetching URLs from inbox items that WebFetch can't reach
- **Any skill**: Import `crawl()` from the script or shell out to the CLI
