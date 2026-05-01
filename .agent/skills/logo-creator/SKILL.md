---
name: logo-creator
description: >
  Design logos using SVG code or AI image generation (OpenAI gpt-image). Offers both paths:
  SVG for iterative vector logos, AI image (gpt-image-2/1) for raster/painterly logos.
  Use when the user asks to "create a logo", "design a logo", "make me a logo".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion, WebFetch
user-invocable: true
---

# Logo Creator

Design logos via two paths: **SVG** (code-generated vectors) or **AI Image** (OpenAI gpt-image-2 raster). Both support iterative refinement with side-by-side preview.

## IMMEDIATE ACTION — Route by Argument

- **`/logo-creator`** (no args) → Start Phase 1 (Interview)
- **`/logo-creator svg`** → Skip to SVG generation (Phase 2A)
- **`/logo-creator ai`** → Skip to AI image generation (Phase 2B)
- **`/logo-creator export`** → Export finalized logo to all platform sizes (Phase 4)

## Phase 1: Interview

Gather context before generating anything.

### Step 1 — Auto-detect context

If in a project directory:
- Read README, package.json, CLAUDE.md, any existing branding/CSS
- Extract: project name, purpose, color palette, design language
- Summarize findings before asking questions

### Step 2 — Ask structured questions

Use `AskUserQuestion` to gather (skip anything already known):

**Question 1 — Generation method:**
```
question: "How should we generate the logo?"
header: "Method"
options:
  - label: "Both (Recommended)"
    description: "Generate SVG concepts AND AI image concepts, compare side by side"
  - label: "SVG only"
    description: "Code-generated vectors — fully editable, infinite scale, free"
  - label: "AI Image only"
    description: "OpenAI gpt-image-2 raster — painterly, photorealistic, unique ($0.02-0.19/image)"
```

**Question 2 — Style direction:**
```
question: "What style direction?"
header: "Style"
options:
  - label: "Minimal / geometric"
    description: "Clean lines, simple shapes, modern SaaS feel"
  - label: "Bold / premium"
    description: "Strong, confident, high contrast — Stripe/Linear aesthetic"
  - label: "Playful / friendly"
    description: "Rounded, colorful, approachable"
  - label: "Abstract / artistic"
    description: "Unique, expressive, stands out"
```

**Question 3 — Color preferences:**
```
question: "Color preferences?"
header: "Colors"
options:
  - label: "Use project colors"
    description: "Pull from existing design system"
  - label: "I have specific colors"
    description: "I'll provide hex codes"
  - label: "Surprise me"
    description: "Pick a palette that fits the vibe"
```

**Question 4 — Format:**
```
question: "What format do you need?"
header: "Format"
options:
  - label: "Icon only (square)"
    description: "Works for favicons, app icons, social avatars"
  - label: "Wordmark only"
    description: "Text-based logo"
  - label: "Combination mark"
    description: "Icon + text together"
```

## Phase 2A: SVG Generation (Gemini 3.1 Pro)

**Primary model: Gemini 3.1 Pro** (via Google AI API). Gemini is exceptionally good at generating clean, beautiful SVGs — significantly better than code-based SVG generation.

### Model ID Resolution

**Before hardcoding any model ID**, resolve the correct API model ID:
1. Check `docs/briefings/model-scan/` for the latest scan JSON
2. If the latest scan is **more than 7 days old**, run `/model-scan` first to refresh — models and pricing change frequently
3. Match the desired model family (e.g., "Gemini 3.1 Pro") to its exact API ID (e.g., `gemini-3.1-pro-preview`)
4. Never guess model IDs — they often differ from marketing names (e.g., `-preview` suffix)

### Gemini SVG Generation

Use the Google AI API to generate SVGs:

```typescript
// Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}
// Body: { contents: [{ parts: [{ text: prompt }] }] }
// Extract SVG from response text (between <svg and </svg>)
```

**API Key lookup order:**
1. `GOOGLE_AI_API_KEY` environment variable
2. Project `.env.local` or `web/.env.local`
3. `~/.env`
4. Ask the user

### SVG Prompt Structure

Each prompt should instruct Gemini to output ONLY SVG code:

```
Generate a single SVG logomark. The logo is for '[company name]', [description].
[Creative direction — concept, visual metaphors, style].
Use [color]. viewBox='0 0 512 512'.
No text labels, no external fonts, no external dependencies.
Make it beautiful, modern, and premium.
Output ONLY the SVG code, nothing else.
```

### SVG Conventions (for Gemini prompts)

Include these in prompts:
- **viewBox**: `0 0 512 512` for icons, `0 0 1024 512` for wordmarks
- **Self-contained**: No external fonts/images
- **Small-size legibility**: Must work at 16-32px favicon size

### Generate 3-5 SVG concepts

1. Create `logos/concepts/` directory
2. Create a generation script that calls Gemini API sequentially (one prompt per concept)
3. Extract SVG from response, save to `logos/concepts/gemini-N.svg`
4. Generate `logos/preview.html` (see Preview Template below)
5. Tell user to open preview in browser

### Fallback: Code-generated SVGs

If Gemini API is unavailable, fall back to Agent-generated SVGs:
- Use the `Agent` tool to generate concepts in parallel
- Each agent writes SVG code directly to `logos/concepts/concept-N.svg`
- Quality will be lower than Gemini-generated SVGs

### Iteration

When user picks a direction:
1. Save refinements to `logos/iterations/iteration-N.svg` (or `gemini-iteration-N.svg`)
2. Regenerate preview after each iteration
3. Include favicon size check (64px, 32px, 16px) in preview

## Phase 2B: AI Image Generation

### Prompt Engineering

Build a detailed prompt from the interview answers. Follow this structure:

```
Design a [format] logo for [project/company name].

The mark should [describe the concept — what it represents, visual metaphors, any letter/shape integration].

Style requirements:
- [Style from interview — minimal/bold/playful/abstract]
- [Color specification — specific hex codes or palette description]
- Transparent background
- Clean, crisp edges
- Must work at small sizes (favicon) and large display
- No text, no letters, no words in the image — purely visual mark
- [Additional style notes based on interview]

The logo should feel [adjectives matching the brand personality].
```

### Generate AI concepts

Use the project's generate-logo script if it exists, or create one:

```typescript
// Script at: logos/generate-logo.ts
import OpenAI from "openai";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const openai = new OpenAI();

async function generate(prompt: string, outPath: string, model = "gpt-image-2") {
  const response = await openai.images.generate({
    model,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const data = response.data[0];
  const buffer = data?.b64_json
    ? Buffer.from(data.b64_json, "base64")
    : Buffer.from(await (await fetch(data!.url!)).arrayBuffer());

  writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath}`);
}
```

Generate 3-4 variations by tweaking the prompt:
1. Save to `logos/concepts/ai-concept-N.png`
2. Default to `gpt-image-2` (best quality). Fall back to `gpt-image-2` if unavailable. Try both for comparison if budget allows.
3. Generate `logos/preview.html` showing all AI concepts
4. **Save every prompt** to `logos/prompts.md` for reproducibility

### Prompt file format (`logos/prompts.md`)

```markdown
# Logo Generation Prompts

## Concept 1
- **Model:** gpt-image-2
- **File:** concepts/ai-concept-1.png
- **Prompt:** [full prompt text]

## Concept 2
...
```

### AI Iteration

When user picks a direction:
1. Refine the prompt based on feedback
2. Save new versions to `logos/iterations/ai-iteration-N.png`
3. Update `logos/prompts.md` with each new prompt
4. Regenerate preview

### OpenAI API Key

Look for the key in this order:
1. `OPENAI_API_KEY` environment variable
2. `.env.local` in current project
3. `~/.env`
4. Ask the user

## Phase 3: Compare & Finalize (when using "Both" method)

If both SVG and AI concepts were generated:

1. Create a combined `logos/preview.html` with sections:
   - "SVG Concepts" — the vector options
   - "AI Concepts" — the raster options
2. User picks overall winner (may be SVG or AI)
3. Continue iterating on the chosen one using the appropriate phase (2A or 2B)

## Phase 4: Export

When the logo is finalized:

### For SVG logos

1. Copy final SVG to `logos/export/logo.svg`
2. Generate PNGs at standard sizes using available tool:
   - Check: `rsvg-convert`, `magick`/`convert`, `inkscape`, `npx sharp-cli`
   - Sizes: 16, 32, 48, 180, 192, 512, 1024, 2048
3. Generate `favicon.ico` from 48px PNG if ImageMagick available

### For AI image logos

1. Copy final PNG to `logos/export/logo.png`
2. Resize to standard sizes using available tool:
   - Check: `magick`/`convert`, `sips` (macOS), `npx sharp-cli`
   - Sizes: 16, 32, 48, 180, 192, 512 (1024 is the original)
3. Generate `favicon.ico` from 48px PNG if ImageMagick available

### Output structure

```
logos/export/
├── logo.svg           # (SVG path only)
├── logo.png           # Original/full size
├── logo-16.png
├── logo-32.png
├── logo-48.png
├── logo-180.png       # Apple touch icon
├── logo-192.png       # PWA
├── logo-512.png       # PWA
├── logo-1024.png
├── logo-2048.png      # (SVG path only)
└── favicon.ico
```

## Preview HTML Template

Use this for all preview pages. Replace `{{PHASE}}` and `{{CARDS}}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Logo Preview — {{PHASE}}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; padding: 2rem; transition: background-color 0.3s, color 0.3s; }
  body.light { background: #f5f5f5; color: #333; }
  body.dark { background: #1a1a1a; color: #eee; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  h1 { font-size: 1.5rem; font-weight: 600; }
  h2 { font-size: 1.1rem; font-weight: 600; margin: 2rem 0 1rem; }
  .toggle { padding: 0.5rem 1rem; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; font-size: 0.875rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
  .card { border: 1px solid rgba(128,128,128,0.3); border-radius: 12px; overflow: hidden; }
  .card-img { display: flex; align-items: center; justify-content: center; padding: 2rem; min-height: 240px; }
  body.light .card-img { background: #fff; }
  body.dark .card-img { background: #2a2a2a; }
  .card-img img { max-width: 100%; max-height: 200px; }
  .card-label { padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 500; border-top: 1px solid rgba(128,128,128,0.3); }
  body.light .card-label { background: #fafafa; }
  body.dark .card-label { background: #222; }
  .size-check { display: flex; gap: 2rem; flex-wrap: wrap; align-items: end; margin-top: 1rem; }
  .size-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .size-row { display: flex; gap: 1rem; align-items: end; }
  .size-label { font-size: 0.75rem; opacity: 0.6; }
</style>
</head>
<body class="light">
  <div class="header">
    <h1>Logo Preview — {{PHASE}}</h1>
    <button class="toggle" onclick="document.body.classList.toggle('dark');document.body.classList.toggle('light');this.textContent=document.body.classList.contains('dark')?'☀️ Light':'🌙 Dark'">🌙 Dark</button>
  </div>
  <div class="grid">{{CARDS}}</div>
</body>
</html>
```

Card template:
```html
<div class="card">
  <div class="card-img"><img src="{{PATH}}" alt="{{LABEL}}"></div>
  <div class="card-label">{{LABEL}}</div>
</div>
```
