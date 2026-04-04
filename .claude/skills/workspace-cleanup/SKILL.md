---
name: workspace-cleanup
description: Clean temporary files, debug scripts, and test outputs after completing tasks. Use when finishing features, ending debugging sessions, or before creating commits.
allowed-tools: Bash, Glob, Read
---

# Workspace Cleanup

Maintain clean project workspace by removing temporary files and debug artifacts.

## When to Use This Skill

Activate when:
- User says "clean up" or "we're done"
- Completing a feature or debugging session
- Before creating PR or final commit
- End of conversation/session
- User mentions "too many temp files" or "cleanup workspace"
- After investigation or analysis work

## Cleanup Philosophy

**Professional workspace** = Clean repository without temporary artifacts

**Benefits:**
- Faster git operations
- Clearer git status
- No accidental commits of temp files
- Easier for others to understand project
- Reduced clutter in file explorer

## The Cleanup Process

### Step 1: Discover Temporary Files

#### Find Temp Scripts (Outside Tests Directory)
```bash
# Find test/debug/temp scripts NOT in tests/
find . -type f \( -name "test_*.py" -o -name "debug*.py" -o -name "temp*.py" -o -name "analyze_*.py" \) \
  -not -path "./tests/*" \
  -not -path "./venv*" \
  -not -path "./.venv/*"
```

#### Find Temp Shell Scripts
```bash
find . -name "*.sh" \( -name "test_*" -o -name "debug_*" -o -name "temp_*" \) -type f
```

#### Find Log Files in Root
```bash
find . -maxdepth 2 -name "*.log" -type f
```

#### Find Analysis Artifacts
```bash
find scripts/ -name "analyze_*.py" -o -name "investigate_*.py" -o -name "check_*.py" 2>/dev/null
```

#### Find Implementation Plans (Completed Features)
```bash
find docs/ -name "*_IMPLEMENTATION.md" -type f 2>/dev/null
```

### Step 2: Categorize Files

Create three categories:

**Always Safe to Remove:**
- `scripts/test_*.py` (investigation scripts, NOT test suite)
- `scripts/debug_*.py`
- `scripts/temp_*.py`
- `scripts/analyze_*.py`
- `scripts/investigate_*.py`
- `scripts/check_*.py`
- `*.log` in project root
- `.DS_Store` files (macOS)
- `__pycache__` directories

**Verify Before Removing:**
- `docs/*_IMPLEMENTATION.md` (if feature is complete)
- Backup files (`*.bak`, `*.backup`)
- Old database files (`*.duckdb.backup`)

**NEVER Remove:**
- `tests/**` (actual test suite)
- `scripts/templates/**` (reusable templates)
- `.env` or `.env.*` files
- `venv*/` or `.venv/` directories
- Database files (`data/*.duckdb`)
- Configuration files
- Any file in git history

### Step 3: Preview Before Removal

**ALWAYS show user what will be removed:**

```
🧹 Workspace Cleanup Preview

Found temporary files:

Scripts (6):
  scripts/test_connection.py
  scripts/debug_query.py
  scripts/temp_analyze.py
  scripts/investigate_q3.py
  scripts/check_crma.py
  scripts/analyze_delta.py

Implementation Plans (2):
  docs/CHAT_PANEL_IMPLEMENTATION.md (feature complete)
  docs/TEMPLATE_VERSION_IMPLEMENTATION.md (feature complete)

Log Files (1):
  debug.log

Total: 9 files

Safe to remove? (All are temporary investigation files)
```

**Wait for user confirmation** before proceeding.

### Step 4: Execute Removal

After user confirms:

```bash
# Remove temp scripts
rm scripts/test_connection.py
rm scripts/debug_query.py
rm scripts/temp_analyze.py
rm scripts/investigate_q3.py
rm scripts/check_crma.py
rm scripts/analyze_delta.py

# Remove completed implementation plans
rm docs/CHAT_PANEL_IMPLEMENTATION.md
rm docs/TEMPLATE_VERSION_IMPLEMENTATION.md

# Remove log files
rm debug.log
```

**Do NOT use wildcards** - remove files explicitly for safety.

### Step 5: Verify Cleanup

```bash
# Check git status (should be cleaner)
git status

# Verify scripts directory
ls scripts/ | grep -E "^(test|debug|temp|analyze)_"

# Should show: no matches or only legitimate files
```

### Step 6: Report Results

**Cleanup Report Template:**
```
🧹 Workspace Cleanup Complete

Removed:
✓ 6 temporary investigation scripts
✓ 2 completed implementation plan docs
✓ 1 debug log file

Preserved:
✓ Test suite (tests/)
✓ Script templates (scripts/templates/)
✓ Production scripts
✓ All configuration files

Status: Workspace is clean ✓
```

## Common Cleanup Patterns

### Pattern 1: Post-Debugging Session

**Scenario:** Finished debugging database connection issues

**Cleanup:**
- `scripts/test_connection.py` → Remove
- `scripts/debug_connection.py` → Remove
- `connection_errors.log` → Remove
- Fixed code → Keep

```bash
rm scripts/test_connection.py scripts/debug_connection.py connection_errors.log
```

### Pattern 2: Post-Feature Implementation

**Scenario:** Completed chat panel feature

**Cleanup:**
- `docs/CHAT_PANEL_IMPLEMENTATION.md` → Remove (feature complete)
- `scripts/test_chat_api.py` → Remove (one-off test)
- Implementation code → Keep
- Test suite additions → Keep

```bash
rm docs/CHAT_PANEL_IMPLEMENTATION.md scripts/test_chat_api.py
```

### Pattern 3: Post-Investigation

**Scenario:** Investigated Q3 data discrepancy

**Cleanup:**
- `scripts/analyze_q3_delta.py` → Remove
- `scripts/investigate_historical.py` → Remove
- `scripts/check_crma_data.py` → Remove
- Documentation of findings → Keep

```bash
rm scripts/analyze_q3_delta.py scripts/investigate_historical.py scripts/check_crma_data.py
```

### Pattern 4: Before PR/Commit

**Scenario:** Ready to create pull request

**Cleanup:**
- All temporary scripts → Remove
- Debug logs → Remove
- Implementation plans → Remove (if complete)
- Actual feature code → Keep
- Tests → Keep

```bash
find . -name "test_*.py" -not -path "./tests/*" -not -path "./venv*" -exec rm {} \;
find . -maxdepth 1 -name "*.log" -exec rm {} \;
```

## Safety Checks

### Check 1: Not in tests/ Directory

```bash
# ✓ Safe to remove
scripts/test_connection.py

# ✗ DO NOT remove (part of test suite)
tests/test_api.py
tests/api/test_endpoints.py
```

**Rule:** Never remove anything in `tests/` directory.

### Check 2: Not a Template

```bash
# ✓ Safe to remove
scripts/test_specific_query.py

# ✗ DO NOT remove (reusable template)
scripts/templates/db_query_template.py
```

**Rule:** Preserve anything in `scripts/templates/` directory.

### Check 3: Not in Git History

```bash
# Check if file is tracked
git ls-files scripts/test_something.py

# If output: File is tracked → Verify before removing
# If no output: File is untracked → Safe to remove
```

### Check 4: Not Environment/Config

```bash
# ✗ NEVER remove
.env
.env.local
config.json
pyproject.toml
package.json

# ✓ Safe to remove
debug.log
test.log
temp_config.json.bak
```

## Cleanup Verification Checklist

Before marking cleanup complete:

- [ ] Listed all temporary files to user
- [ ] User confirmed removal
- [ ] Files removed explicitly (not with wildcards)
- [ ] Verified no test suite files removed
- [ ] Verified no template files removed
- [ ] Verified no config files removed
- [ ] Git status cleaner than before
- [ ] Provided cleanup report to user

## Special Cases

### Case 1: Database Backups

**Files:** `data/*.duckdb.backup`, `*.db.bak`

**Action:** Ask user before removing
```
Found database backup files:
  data/gam_forecast.duckdb.backup (10 MB, 3 days old)

These may be important. Remove? (Recommend keeping recent backups)
```

### Case 2: Implementation Plans Mid-Development

**Files:** `docs/*_IMPLEMENTATION.md` with incomplete phases

**Action:** Ask user if feature is complete
```
Found implementation plan:
  docs/NEW_FEATURE_IMPLEMENTATION.md

Is this feature complete? If not, I'll keep the plan.
```

### Case 3: Python Cache

**Files:** `__pycache__/`, `*.pyc`

**Action:** Safe to remove, Python regenerates
```bash
find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null
find . -name "*.pyc" -delete
```

### Case 4: Node Modules

**Files:** `node_modules/`, `frontend/node_modules/`

**Action:** NEVER remove without user request
These are dependencies, not temporary files.

## Integration with Git Workflow

### Pre-Commit Cleanup

Before committing:
```bash
# Check for uncommitted temp files
git status --short | grep -E "test_|debug_|temp_|analyze_"

# If found, cleanup before commit
```

### Pre-PR Cleanup

Before creating pull request:
1. Run full cleanup
2. Review `git status`
3. Ensure only intended changes staged
4. No temp files in changeset

## When NOT to Use This Skill

- Middle of active investigation → Keep temp files for now
- User hasn't confirmed → Don't remove without permission
- Files are part of project structure → Not temporary
- Database files → Not cleanup material

## Success Criteria

✓ All temporary files identified correctly
✓ User confirmed removal list
✓ Files removed explicitly and safely
✓ No test suite files affected
✓ No template files affected
✓ No configuration files affected
✓ Git status cleaner than before
✓ Cleanup report provided to user
✓ Workspace professionally maintained
