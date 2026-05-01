---
name: codex-write
description: >
  Delegates heavy code generation to Codex CLI while Claude orchestrates,
  reviews, and surgically fixes. Use for any task involving 50+ lines of new code,
  boilerplate generation, test writing, or large refactors.
  Claude acts as Lead Engineer; Codex acts as Developer.
  Supports multi-LLM mode — checks .claude/llm-mode.json before delegating.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
user-invocable: true
metadata:
  version: "2.0.0"
  author: emmanuel
---

# Codex CLI Code Delegation

You are the Lead Engineer. Codex is your Developer. Your job is to:
1. **Architect** — decide what needs to be built and how it fits the codebase
2. **Delegate** — hand Codex a precise, context-rich prompt
3. **Review** — verify the output meets project standards
4. **Fix** — surgically correct any issues with your native tools

You NEVER delegate blindly. You always understand the architecture first, then delegate the typing.

## When to Use

**Manual:** `/codex-write Refactor the checkout API route to support multi-currency`

**Good candidates for delegation:**
- New component/page creation (boilerplate-heavy)
- Test file generation (repetitive patterns)
- API route scaffolding
- Large refactors with clear before/after specs
- Migration scripts
- Data transformation utilities

**Keep in Claude (do NOT delegate):**
- Architectural decisions
- Security-sensitive code (auth, payments, API keys)
- Complex business logic requiring deep context
- Surgical fixes (<20 lines)

## Multi-LLM Mode Check

1. Read `.claude/llm-mode.json` — if `mode` is `"multi"`, proceed with Codex delegation
2. If `mode` is `"single"` or file doesn't exist, write the code yourself
3. If Codex delegation fails at any point, take over and write the code yourself

## IMMEDIATE ACTION

### Step 0: Load Project Context

Load core memory sources to include in the Codex prompt:

```bash
# Brand config (framework, conventions, terminology)
cat .claude/brand.json 2>/dev/null || echo "NO_BRAND_CONFIG"

# Failure atlas — known mistakes to avoid
cat docs/memory/failure-atlas.md 2>/dev/null || echo "NO_FAILURE_ATLAS"

# Recent decisions — architectural context
tail -80 docs/decisions/log.md 2>/dev/null || echo "NO_DECISIONS_LOG"
```

If brand.json is found, extract `framework`, `conventions`, and `terminology` fields for the prompt template.

**Failure atlas integration:** Scan the failure atlas for entries whose **Trigger Pattern** matches the current task. If a match is found, include the relevant **Prevention Rule** in the Codex prompt as a hard constraint. This prevents the system from repeating known mistakes.

**Recall-augmented context (optional):** If the task touches a domain with known history (e.g., a module that had past bugs, a pattern that was debated), run `/recall <task-domain>` to surface relevant decisions, past failures, or solutions. Include the top 2-3 results as additional context in the Codex prompt under a `## Known History` section. Skip this for greenfield tasks with no project history.

### Step 1: Pre-Flight Checks

```bash
# 1. Check working tree is clean
DIRTY=$(git status --porcelain 2>/dev/null | head -5)
if [ -n "$DIRTY" ]; then
  echo "DIRTY_TREE"
  echo "$DIRTY"
fi

# 2. Check Codex CLI is available
codex --version 2>/dev/null || echo "CODEX_NOT_FOUND"

# 3. Record safety point
git rev-parse HEAD
```

**If dirty tree:** STOP. Tell user: "Uncommitted changes. Codex requires clean working tree. Commit first or shall I write directly?"

**If Codex not found:** Fall back to writing code yourself. No error to user.

### Step 2: Build the Prompt

A bad prompt wastes tokens. A great prompt produces production-ready code on first try.

**Prompt Structure:**

```
You are working on a [FRAMEWORK] application.

## Project Context
[PULL FROM brand.json IF AVAILABLE, OTHERWISE INFER FROM CODEBASE]

## Conventions
[PULL FROM brand.json conventions, OR READ FROM CLAUDE.md / existing code patterns]

## Terminology
[PULL FROM brand.json terminology, IF ANY]

## Known Mistakes — DO NOT REPEAT
[MATCHING FAILURE ATLAS ENTRIES: prevention rules as hard constraints]

## Known History
[TOP 2-3 /recall RESULTS IF RELEVANT, OTHERWISE OMIT THIS SECTION]

## Task
[INSERT SPECIFIC TASK DESCRIPTION]

## Files to Modify/Create
[LIST SPECIFIC FILES AND WHAT CHANGES IN EACH]

## Existing Code Reference
[PASTE RELEVANT EXISTING CODE PATTERNS]
```

**How to build the prompt:**

1. **Read the files** that will be modified or serve as patterns
2. **Extract the relevant pattern.** Find an existing similar file and include it as reference.
3. **Be hyper-specific.** Don't say "add authentication" — say exactly what pattern to follow.
4. **Include file paths.** Tell Codex exactly which files to create or modify.
5. **Include type information.** If specific types are needed, include the definitions.

### Step 3: Execute Codex

```bash
START_TIME=$(date +%s)
SAFETY_COMMIT=$(git rev-parse HEAD)

codex exec \
  -m gpt-5.5 \
  -s workspace-write \
  "[THE PROMPT]" \
  2>&1 | tee .codex_output.log

CODEX_EXIT=$?
DURATION=$(($(date +%s) - START_TIME))
```

**Critical flags:**
- `-m gpt-5.5` — flagship model, 1050K context (subscription)
- `-s workspace-write` — allows file writes
- NEVER use `-s danger-full-access` unless user explicitly requests
- NEVER pass auth flags — Codex handles its own auth

**For long prompts** (>2000 chars), use stdin:
```bash
echo "THE LONG PROMPT" | codex exec -m gpt-5.5 -s workspace-write - 2>&1 | tee .codex_output.log
```

### Step 4: Verification Pipeline (4 Layers)

**Layer 1: Exit Code** — non-zero → go to fallback

**Layer 2: Diff Review**
```bash
git diff --stat
git diff
```
Check: right files modified, reasonable scope, no unexpected files.

**Layer 3: Type Check**
```bash
npm run type-check 2>&1 | tail -20
```
Claude fixes type errors surgically with Edit tool.

**Layer 4: Claude Review** — read diff and evaluate conventions, security, terminology, complexity.

If issues found in Layer 4, fix surgically with Edit. Do NOT re-run Codex.

### Step 5: Fallback Cascade

When Codex fails or produces unusable output:

```bash
git checkout -- .
git clean -fd
```

Then write the code yourself. Tell user: "Codex delegation didn't produce usable output. Writing directly."

**Fallback triggers:**
- Exit code != 0
- Empty diff
- Diff touches >3x expected files
- >10 new type errors
- Security issues detected

### Step 6: Post-Execution

**Log the delegation** (append to `.claude/delegation.log`):
```
YYYY-MM-DDTHH:MM:SSZ | codex-write | ok | Ns | [short task description]
```

**Report to user:**
```
## Codex Delegation: [Task]

### Result: [Success / Partial (Claude fixed N issues) / Fallback (Claude wrote directly)]

### Files Changed
- path/to/file.ts — [what changed]

### Verification
- Type check: [pass / N issues fixed]
- Convention review: [pass / N issues fixed]
```

## Anti-Patterns

- **Delegating without reading first.** Understand existing code before prompting.
- **Vague prompts.** Be specific about files, patterns, and expected output.
- **Delegating security code.** Auth, payments, data access = Claude's work.
- **Skipping verification.** All 4 layers, no exceptions.
- **Re-running Codex to fix Codex.** Claude fixes surgically instead.
- **Delegating on a dirty tree.** Always start from clean git state.

## Integration Points

- **With `/plan`:** After plan approval, heavy coding steps use `/codex-write`
- **With `/brief`:** Run before delegation to surface constraints for the prompt
- **With `/review`:** After delegation, deeper quality check
- **With `/recall`:** Surface history for the module being modified — past bugs, decisions, known patterns
- **With `/learn`:** Capture interesting patterns from Codex output
- **With `/mode`:** Only delegates in multi mode
