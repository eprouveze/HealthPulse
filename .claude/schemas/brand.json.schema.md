# brand.json Schema

Place at `.claude/brand.json` in any project to provide project-specific context to global skills.

## Schema

```json
{
  "project": {
    "name": "MyWritingTwin",
    "description": "AI writing assistant that learns your style",
    "domain": "mywritingtwin.com"
  },

  "framework": {
    "type": "nextjs",
    "router": "app",
    "language": "typescript",
    "styling": "tailwind",
    "database": "supabase",
    "package_manager": "npm"
  },

  "brand": {
    "colors": {
      "primary": "#0891b2",
      "secondary": "#6b7280",
      "accent": "#f97316",
      "success": "#22c55e",
      "background": "#f9fafb"
    },
    "watermark": "MyWritingTwin.com",
    "style": "Clean, modern, professional"
  },

  "terminology": {
    "use": {
      "Writing Twin": "never 'Voice Twin'",
      "Style Profile": "never 'Voice Profile'",
      "Writing DNA": "never 'Voice DNA'"
    },
    "avoid": ["Moreover", "Furthermore", "Delve", "Utilize"]
  },

  "conventions": [
    "Use createServerComponentClient for server components (with RLS)",
    "Use createServiceClient for admin/system operations (bypasses RLS)",
    "Lazy-initialize API clients in route handlers (never at module level)",
    "All API routes need rate limiting via checkRateLimit",
    "Accessibility: aria-hidden on decorative icons, aria-label on interactive ones"
  ],

  "i18n": {
    "locales": ["en", "ja", "fr", "es"],
    "default": "en",
    "library": "next-intl",
    "translation_fn": "useTranslations"
  },

  "content": {
    "blog_dir": "content/blog-posts",
    "image_dir": "public/blog-posts",
    "formats": ["mdx"]
  },

  "review_checks": {
    "security": [
      "Supabase RLS: createServerComponentClient (with RLS) vs createServiceClient (bypasses RLS)?",
      "Supabase RLS performance: auth.uid() wrapped in (select auth.uid())?",
      "Stripe webhooks: constructEvent used to verify signatures?",
      "API routes: rate limiting applied via checkRateLimit?",
      "Lazy initialization: No module-level new Stripe() or API client instantiation?"
    ],
    "architecture": [
      "Server vs Client Component boundary: 'use client' pushed down to leaf components?",
      "NEXT_PUBLIC_* variables: Only truly public config, never secrets?",
      "New UI strings use useTranslations(), not hardcoded English?",
      "Currency handling uses lib/currency.ts utilities?"
    ],
    "performance": [
      "RLS policy: auth.uid() wrapped in (select auth.uid()) for per-row efficiency?",
      "API response size: .select() column filtering in Supabase queries?"
    ],
    "a11y": [
      "All 4 locales (en, ja, fr, es) handled?",
      "Translation keys added to all message catalogs?"
    ]
  }
}
```

## How Skills Use brand.json

Skills read `.claude/brand.json` at the start of execution:

1. **`/review`** — reads `review_checks` to augment standard review agents with project-specific checks
2. **`/codex-write`** — reads `framework`, `conventions`, `terminology` to build accurate Codex prompts
3. **`/brief`** — reads `terminology` and `content` to know what constraints and directories to scan
4. **Content skills** — read `brand` for colors, watermark, style when generating images/infographics
5. **Image skills** — read `brand.colors` for palette, `brand.watermark` for attribution

## Creating brand.json for a New Project

Minimum viable config (just what skills actually use):

```json
{
  "project": { "name": "ProjectName" },
  "framework": { "type": "nextjs", "language": "typescript" },
  "terminology": { "use": {}, "avoid": [] },
  "conventions": []
}
```

Add sections as skills need them. Not every project needs `i18n`, `content`, or `review_checks`.

## File Location

Always at `.claude/brand.json` in the project root. Skills look for it there.
