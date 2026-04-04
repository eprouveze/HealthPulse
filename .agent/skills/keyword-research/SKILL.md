---
name: keyword-research
description: >
  Check Google Trends for keyword interest and SEO prioritization. Use when user mentions
  "keyword research", "SEO", "search trends", "content strategy", "blog prioritization",
  "compare keywords", "trending topics", or wants to evaluate keyword opportunities.
---

# Keyword Research

Check Google search trends and relative interest for keywords. Useful for SEO content strategy, blog post prioritization, and deciding where to place marketing assets.

## IMMEDIATE ACTION

When this skill is invoked, run the keyword research script:

```bash
npx tsx scripts/keyword-research.ts
```

If the user provides arguments, pass them through:

```bash
npx tsx scripts/keyword-research.ts --keywords "custom GPT instructions, AI writing tools, ChatGPT voice"
npx tsx scripts/keyword-research.ts --related "custom GPT instructions"
npx tsx scripts/keyword-research.ts --geo US --top 5
```

## Available Commands

### Compare all tracked keywords (blog posts + landing pages)

```bash
npx tsx scripts/keyword-research.ts
```

Returns a ranked table of all primary keywords from blog posts and landing pages, sorted by average Google Trends interest over the last 12 months.

### Compare specific keywords

```bash
npx tsx scripts/keyword-research.ts --keywords "keyword1, keyword2, keyword3"
```

Compare up to 15 custom keywords. Google Trends allows max 5 per batch, so they're compared in batches.

### Related queries for a keyword

```bash
npx tsx scripts/keyword-research.ts --related "custom GPT instructions"
```

Returns:
- **Top related queries**: Most commonly searched alongside this keyword
- **Rising queries**: Fastest-growing related searches (breakout = >5000% growth)
- **Top regions**: Countries with highest search interest

### Filter by country

```bash
npx tsx scripts/keyword-research.ts --geo US
npx tsx scripts/keyword-research.ts --geo JP
npx tsx scripts/keyword-research.ts --related "AI writing" --geo US
```

Use ISO 3166-1 alpha-2 country codes.

### Show top N only

```bash
npx tsx scripts/keyword-research.ts --top 5
```

## Understanding Results

- **Average Interest**: Relative number (0-100) where 100 = peak search interest for that term in the period. NOT absolute search volume.
- **0 interest**: The keyword has too little search volume for Google Trends to register. This doesn't mean zero searches — it means it's below Google Trends' threshold (roughly <1000 monthly searches).
- **Comparing across batches**: Keywords in different batches are compared to different baselines. The best comparisons are within the same batch (up to 5 keywords).

## Limitations

- Google Trends shows **relative** interest, not absolute search volume. A score of 50 means half the peak interest, not 50 searches.
- Very niche/long-tail keywords often show 0 because they fall below Google Trends' threshold.
- For actual monthly search volume numbers, you'd need a paid tool like Ahrefs, SEMrush, or DataForSEO.
- Rate limited: wait between requests to avoid being blocked.

## Tracked Keywords

Keywords are defined in `scripts/keyword-research.ts` in the `BLOG_KEYWORDS` and `LANDING_KEYWORDS` objects. Update these when adding new blog posts or landing pages.

## Ad-Hoc Queries

For quick one-off checks, you can also query Google Trends directly:

```typescript
import googleTrends from "google-trends-api";

const result = await googleTrends.interestOverTime({
  keyword: ["ChatGPT custom instructions", "AI writing tools"],
  startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  geo: "US",
});
const data = JSON.parse(result);
console.log(data.default.timelineData);
```
