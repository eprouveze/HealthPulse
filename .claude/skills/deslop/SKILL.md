---
name: deslop
description: Remove AI writing patterns from content. Use when reviewing blog posts, marketing copy, emails, or any customer-facing text. Checks for 22 AI-tell patterns across phrasing, rhythm, and authenticity. Trigger phrases — "deslop this", "clean up AI writing", "check for AI patterns", "remove AI tells", "content quality check", "is this sloppy".
version: "1.1.0"
author: lex
effort: medium
allowed-tools: Read, Edit, Grep, Glob
metadata:
  filePattern: "*.mdx,*.md"
  bashPattern: ""
  priority: 50
---

# Deslop — AI Writing Pattern Removal

Strip AI-generated writing patterns from any content. Works on existing files or inline text.

## When to Use

- After drafting any customer-facing content (blog posts, emails, landing pages)
- During content QA (Night Shift, manual review)
- When reviewing existing content for quality
- Before publishing or committing content

## The 22 AI-Tell Patterns

### Phrasing Flags

| # | Pattern | Example | Fix |
|---|---------|---------|-----|
| 1 | **Em-dashes** (max 5/file) | "AI tools — especially ChatGPT — are changing..." | Rewrite with commas, colons, or split into two sentences |
| 2 | **Corrective antithesis** | "It's not about X. It's about Y." / "Not X. But Y." | State your position directly without the false setup |
| 3 | **Dramatic pivot phrases** | "But here's the thing", "Here's the catch", "Here's what most people miss" | Cut entirely or use a natural transition |
| 4 | **Soft hedging** | "It's worth noting", "It's important to remember", "Something we've observed" | Say it directly — if it's worth noting, just note it |
| 5 | **AI-tell words** | delve, landscape, realm, tapestry, leverage (verb), paradigm, robust, utilize, synergy, elevate, foster, holistic, streamline, cutting-edge, game-changer, deep dive | Replace with plain English equivalents |
| 19 | **Negation framing** | "isn't just about X", "isn't simply", "it's not X, it's Y", "goes beyond merely", "more than just a" | State the positive claim directly — don't set up what something "isn't" before saying what it is |
| 20 | **"From X to Y" coverage spans** | "from startups to enterprises", "from beginners to experts", "from simple to complex" | Either commit to a specific audience or drop the qualifier |
| 21 | **"Whether X or Y" inclusivity** | "whether you're a developer or a designer", "whether you work in X or Y" | Pick your audience or trust them to self-select |

### Rhythm Flags

| # | Pattern | Example | Fix |
|---|---------|---------|-----|
| 6 | **Staccato repetition** | "Short sentence. Another short. One more short." (3+ consecutive short sentences) | Vary sentence length — mix short punches with longer context sentences |
| 7 | **Cookie-cutter paragraphs** | Every paragraph is exactly 3 sentences, same length | Match paragraph size to idea complexity — some ideas need 1 sentence, others need 5 |
| 8 | **Gift-wrapped endings** | "In summary...", "In conclusion...", "To sum up...", "The bottom line is..." | End with insight or forward-looking statement, not a recap |
| 9 | **Throat-clearing openers** | "Let's explore", "Let's unpack", "Let's dive in", "Let's take a closer look" | Start directly with the content — cut the throat-clearing entirely |
| 10 | **List-heavy structure** | Every section is a bullet list, no prose | Use prose for narrative flow, lists only for genuinely enumerable items |

### Authenticity Flags

| # | Pattern | Example | Fix |
|---|---------|---------|-----|
| 11 | **Perfect punctuation** | No fragments, no rule-breaking, reads like a textbook | Add deliberate fragments for punch. Break rules when they sound better. |
| 12 | **Copy-paste metaphors** | Same metaphor repeated identically 3+ times | Vary the language or trust readers to remember the concept |
| 13 | **Overexplaining** | "Email — a digital form of communication — has..." | Assume reader intelligence. Skip obvious definitions. |
| 14 | **Generic examples** | "Companies like [any company] are seeing results" | Use specific, insider-level details with sharp commentary |
| 15 | **Superlative stacking** | "Powerful, revolutionary, game-changing solution" | One strong claim > three weak ones |
| 16 | **False balance** | "While X has pros and cons..." (hedging every position) | Take a position. Strong writing commits. |
| 17 | **Transition word abuse** | "Moreover", "Furthermore", "Additionally", "However" starting every paragraph | Vary transitions or cut them — strong paragraphs connect through logic, not conjunctions |
| 18 | **Emoji/exclamation inflation** | "This is amazing! 🚀 Check it out! 🎉" | One exclamation per piece max. Zero emojis unless brand requires them. |

## How to Run

### On a single file

```
/deslop content/blog-posts/my-post.mdx
```

### On all blog posts in a project

```
/deslop --all
```

### Workflow

1. **Scan**: Read the file(s)
2. **Flag**: For each pattern, grep or manually identify violations
3. **Count**: Report violation counts per pattern
4. **Fix**: Apply fixes inline — preserve meaning, change delivery
5. **Verify**: Re-scan to confirm clean

### Automated Checks (greppable)

These patterns can be detected with grep/regex:

```bash
# Em-dashes (count, max 5)
grep -c '—' "$FILE"

# Corrective antithesis
grep -iE "(It'?s not about|Not [A-Z].*\. But |Not [A-Z].*\. It'?s )" "$FILE"

# Dramatic pivots
grep -iE "(But here'?s the (thing|catch|kicker|reality)|Here'?s what (most|many|few))" "$FILE"

# Soft hedging
grep -iE "(It'?s worth (noting|mentioning|remembering)|It'?s important to (note|remember|understand)|Something (we'?ve|I'?ve) observed)" "$FILE"

# AI-tell words
grep -iE "\b(delve|landscape|realm|tapestry|leverage[sd]?|paradigm|robust|utilize[sd]?|synergy|elevate[sd]?|foster|holistic|streamline[sd]?|cutting-edge|game-?changer|deep dive)\b" "$FILE"

# Gift-wrapped endings
grep -iE "^(In (summary|conclusion)|To sum up|The bottom line|All in all|Ultimately,)" "$FILE"

# Throat-clearing
grep -iE "^(Let'?s (explore|unpack|dive|take a closer|break down|look at)|In this (article|post|guide|section))" "$FILE"

# Transition word abuse (at paragraph start)
grep -iE "^(Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless)" "$FILE"

# Negation framing (#19)
grep -iE "\b(isn'?t just|isn'?t simply|not just about|goes beyond merely|more than just a)\b" "$FILE"

# "From X to Y" coverage spans (#20)
grep -iE "from (startups?|beginners?|small|large|simple|complex|novice|expert)" "$FILE"

# "Whether X or Y" inclusivity (#21)
grep -iE "whether you'?re? (a |an )?\w+" "$FILE"
```

### Manual Checks (require human judgment)

- Staccato repetition (consecutive short sentences)
- Cookie-cutter paragraphs (uniform length)
- Perfect punctuation (no fragments or rule-breaking)
- Copy-paste metaphors (same metaphor repeated)
- Overexplaining (defining obvious terms)
- Generic examples (vague company references)
- Superlative stacking (multiple weak adjectives)
- False balance (hedging every position)
- **#22 Tricolon / rule of threes** — compulsive 3-part parallel lists ("fast, reliable, and scalable" / "we researched, analyzed, and synthesized"). 2 instances = fine, 4+ = pattern flag.

## Severity Levels

| Level | Action | Patterns |
|-------|--------|----------|
| **BLOCK** | Must fix before publish | AI-tell words, em-dashes >5, throat-clearing, gift-wrapped endings |
| **WARN** | Should fix, not blocking | Corrective antithesis, dramatic pivots, soft hedging, transition abuse, negation framing (#19), coverage spans (#20), inclusivity framing (#21) |
| **NOTE** | Improve if time allows | Staccato, cookie-cutter, perfect punctuation, overexplaining, tricolon overuse (#22) |

## Integration Points

- **Night Shift content QA**: Run automated checks as part of Tier 2 validation
- **Content creator skills**: Reference this skill in quality checklist
- **Manual review**: Use the full 18-pattern checklist before publishing
- **Existing content audit**: Run `--all` mode across blog posts to find and fix legacy violations

## Credit

Patterns derived from Tahi's "12 Red Flags of AI Writing" (mooch.agency, Feb 2026), extended with 6 additional patterns from Golden Corpus content QA experience. Patterns #19–22 added Apr 2026 from Jejomar Contawe's "The Single Most Prevalent AI Writing Tell" (Medium, Feb 2026) — negation framing, coverage spans, inclusivity framing, and tricolon overuse.
