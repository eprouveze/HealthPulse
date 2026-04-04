---
name: recall
description: "Search across ALL memory stores — decisions, feedback, solutions, mistakes, capabilities, contacts, session topics. Returns top 5 results with evidence paths and confidence scores. Use when you need to find something in Lex's memory: '/recall night-shift', '/recall why did we choose node-pty', '/recall who is Zak El Fassi', 'do you remember', 'what do we know about'."
user_invocable: true
args: "query"
---

# /recall — Semantic Memory Search

Search across ALL memory stores using the Anamnesis SQLite index (FTS5 + Gemini embeddings, 14,000+ chunks). Returns top 5 results with source citations and confidence scores.

## Primary: Anamnesis Database Search

### Step 1: Run the indexer search command

Use the Bash tool to run:

```bash
# Path auto-detection: works on M4, M2, and any machine with lex repo
MEMORY_SCRIPT=""
for p in \
  "$HOME/Documents/Dev/lex/scripts/memory-index.py" \
  "/Volumes/Home/Lex - DO NOT TOUCH/Dev/lex/scripts/memory-index.py" \
  "$(find "$HOME" -maxdepth 4 -path "*/lex/scripts/memory-index.py" 2>/dev/null | head -1)"; do
  [ -f "$p" ] && MEMORY_SCRIPT="$p" && break
done
python3 "$MEMORY_SCRIPT" search "<query>"
```

The script performs two-stage retrieval:
1. **FTS5 keyword search** → up to 50 candidates
2. **Gemini embedding rerank** → cosine similarity × store weight × freshness → top 5

The script prints formatted results directly. Capture and present them verbatim.

### Step 2: Parse query before running (optional pre-processing)

Before running the command, expand abbreviations in the query string:
- "NS" → "night-shift"
- "MWT" → "MyWritingTwin"
- "FD" → "FluxDiagram"
- "GAM" → "GAM-Forecast-Tool"

Use the expanded form as the search query.

### Step 3: Present results

The script outputs results in this format — present them as-is:

```
### Result N (confidence: X.XX) [⚠️ CAUTION: Epistemic Gap]
**Claim**: <title>
**Evidence**: <absolute file path>
**Type**: <store_type> | **Project**: <project>
**Score breakdown**: similarity=X.XX × weight=Xx × freshness=X.X
```followed by a content excerpt```
```

After presenting results, synthesize a direct answer to the user's question using the top results.

## Fallback: Grep-based Search

If the database doesn't exist (`~/.claude/memory/memory.db`) or the script fails (exit code non-zero), fall back to parallel grep across all stores:

| Store | Path | Weight |
|-------|------|--------|
| Decisions log | `~/Documents/Dev/lex/docs/decisions/log.md` | 1.5x |
| Feedback files | `~/.claude/projects/-Users-emmanuel-Documents-Dev-lex/memory/feedback_*.md` | 1.3x |
| Failure atlas | `~/Documents/Dev/lex/docs/memory/failure-atlas.md` | 1.3x |
| Solution files | `~/Documents/Dev/lex/docs/solutions/**/*.md` | 1.2x |
| Session topics (lex) | `~/Documents/Dev/lex/docs/sessions/topics/*.md` | 1.1x |
| Session topics (MWT) | `~/Documents/Dev/MyWritingTwin/docs/sessions/topics/*.md` | 1.1x |
| Project intel files | `~/Documents/Dev/*/.claude/project-intel.md` | 1.0x |
| MEMORY.md | `~/.claude/projects/-Users-emmanuel-Documents-Dev-lex/memory/MEMORY.md` | 1.0x |
| Capabilities | `~/.claude/memory/capabilities.json` | 1.0x |
| Contacts | `~/.claude/memory/contacts.json` | 1.0x |

Run all Grep calls in parallel. Score results by keyword density × file weight × freshness. Deduplicate: if the same fact appears in multiple stores, keep the highest-weighted source.

### Special Query Handling (fallback only)

- **WHO queries**: Search contacts.json first, then session logs
- **WHY queries**: Search decisions/log.md first
- **HOW queries**: Search solutions/ first
- **WHEN queries**: Search session topics + decisions log for dates

## Rules

- If NO results found: say "No memory found for this query" honestly. Do NOT hallucinate.
- If results conflict: present both with a note about the contradiction
- Always provide the evidence path so the user can verify
- Use JST time for dates
- Confidence < 0.4 → flag as **⚠️ CAUTION: Epistemic Gap** and suggest the user verify
