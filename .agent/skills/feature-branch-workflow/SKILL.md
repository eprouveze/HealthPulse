---
name: feature-branch-workflow
description: Set up proper Git feature branch workflow at start of new features. Use when user requests new features or major changes to ensure proper branching.
allowed-tools: Bash
---

# Feature Branch Workflow

Establish proper Git branching workflow for safe, organized feature development.

## When to Use This Skill

Activate when:
- User requests new feature
- Starting work on significant changes
- Beginning of development session
- User says "let's add...", "I want to implement...", "create new..."
- Before starting multi-file changes
- User mentions feature work

## Git Branch Philosophy

**Never work on main/master:**
- main/master = stable, tested code
- Feature branches = work in progress
- Easy rollback if something goes wrong
- Clean history with meaningful branch names

**Benefits:**
- Safe experimentation
- Easy rollback
- Clear feature scope
- Better collaboration
- Professional workflow

## Branch Workflow Process

### Step 1: Check Current Status

```bash
git status
git branch --show-current
```

**Interpretation:**

**If on main/master:**
- ✓ Good starting point
- Proceed to create feature branch

**If on feature branch:**
- Ask user: "Currently on `branch-name`. Continue here or create new branch?"
- User choice determines next step

**If uncommitted changes:**
```
On branch main
Changes not staged for commit:
  modified:   src/file.py
```
- Ask user: "You have uncommitted changes. Commit them first or stash?"

### Step 2: Create Feature Branch

#### Branch Naming Convention

Format: `type/descriptive-name`

**Types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation only
- `chore/` - Dependencies, cleanup

**Descriptive name:**
- Kebab-case (lowercase with hyphens)
- Clear and specific
- 2-4 words typically
- Max ~40 characters

**Good Examples:**
- `feature/chat-panel`
- `feature/template-versioning`
- `feature/multi-year-guidance`
- `fix/database-connection-conflicts`
- `fix/crma-reconciliation-logic`
- `refactor/async-database-patterns`
- `docs/api-documentation`

**Bad Examples:**
- `my-branch` (not descriptive)
- `feature` (too vague)
- `fix-bug` (which bug?)
- `FeatureName` (wrong case)
- `feature_name` (use hyphens not underscores)

#### Create Branch

```bash
git checkout -b feature/descriptive-name
```

**Example:**
```bash
# User wants to add risk scoring to AI guidance
git checkout -b feature/ai-risk-scoring
```

### Step 3: Verify Branch

```bash
git branch --show-current
```

**Should output:** `feature/descriptive-name`

```bash
git status
```

**Should show:** `On branch feature/descriptive-name`

### Step 4: Set Commit Strategy

**Establish commit pattern with user:**

**Small, Incremental Commits:**
- Commit after each logical step
- Don't wait until feature is "done"
- Each commit should compile/work
- Easy to rollback specific changes

**Commit Message Format:**
```
type: brief description of change

Longer explanation if needed.
```

**Types match branch types:**
- `feat:` - New feature work
- `fix:` - Bug fixes
- `refactor:` - Code improvements
- `docs:` - Documentation
- `chore:` - Maintenance

**Good Commit Messages:**
- `feat: add risk scoring calculation to AI service`
- `feat: add risk score display to guidance UI`
- `fix: resolve CRMA-Org62 join on opportunity name`
- `refactor: extract database connection to service class`
- `docs: add API documentation for risk scoring endpoint`

**Bad Commit Messages:**
- `update` (what was updated?)
- `fix` (fix what?)
- `changes` (what changed?)
- `wip` (work in progress - too vague)

### Step 5: Work → Commit Pattern

**During development:**

```bash
# Make changes
# ... edit files ...

# Check what changed
git status
git diff

# Stage specific files
git add src/services/risk_service.py
git add src/api/v2_ai.py

# Commit with clear message
git commit -m "feat: add risk scoring service with calculation logic"

# Continue working
# ... more changes ...

# Commit again
git add frontend/src/components/RiskDisplay.tsx
git commit -m "feat: add risk score display component"
```

**Frequency:** Commit every 20-30 minutes or after completing a logical step.

### Step 6: Push to Remote (Optional)

**If working solo:**
```bash
# First push
git push -u origin feature/descriptive-name

# Subsequent pushes
git push
```

**If collaborating:**
- Push regularly so others can see progress
- Pull before pushing if others might have pushed

### Step 7: End of Session Checklist

Before user ends session:

```bash
# Stage all work
git add [files]

# Commit with descriptive message
git commit -m "feat: [what was accomplished]"

# Optional: Push to remote
git push

# Show final status
git log --oneline -5
git status
```

**Report to user:**
```
✓ Work committed on branch: feature/descriptive-name
✓ 3 commits made:
  - feat: add risk scoring service
  - feat: add risk score display component
  - feat: integrate risk scoring in AI guidance

✓ Branch pushed to remote (optional)

To continue later:
  git checkout feature/descriptive-name
```

## Branch Management

### Switching Branches

**To switch to existing branch:**
```bash
git checkout branch-name
```

**To see all branches:**
```bash
git branch -a
```

### Merging Completed Feature

When feature is complete and tested:

```bash
# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge --no-ff feature/descriptive-name -m "feat: [feature summary]"

# Push merged main
git push origin main

# Delete feature branch (optional)
git branch -d feature/descriptive-name
```

**Note:** User should typically create PR instead of direct merge.

### Creating Pull Request

After feature is complete:

```bash
# Ensure branch is pushed
git push -u origin feature/descriptive-name

# Use gh CLI to create PR
gh pr create --title "Feature: Risk Scoring for AI Guidance" --body "$(cat <<'EOF'
## Summary
- Added risk scoring calculation to AI service
- Added risk score display in guidance UI
- Integrated with forecast guidance endpoint

## Test Plan
- [x] Risk scores calculate correctly
- [x] Display shows scores properly
- [x] Integration tested end-to-end
EOF
)"
```

## Protection Rules

### NEVER Do These

**❌ Work directly on main/master:**
```bash
# Wrong
git checkout main
# ... make changes on main ...
```

**❌ Force push without user confirmation:**
```bash
# Dangerous - ask user first
git push --force
```

**❌ Commit broken code:**
- Always ensure code compiles/runs before committing
- Test before each commit

**❌ Use generic commit messages:**
```bash
# Bad
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
```

### Always Do These

**✓ Create feature branch:**
```bash
git checkout -b feature/name
```

**✓ Verify branch before working:**
```bash
git branch --show-current
```

**✓ Commit frequently with clear messages:**
```bash
git commit -m "feat: specific accomplishment"
```

**✓ Check status before commits:**
```bash
git status
git diff
```

## Common Scenarios

### Scenario 1: Starting Fresh Feature

**User:** "Add a chat panel for AI conversations"

**Actions:**
```bash
git status                              # Check current state
git checkout main                       # Switch to main
git pull                               # Get latest
git checkout -b feature/ai-chat-panel  # Create feature branch
git branch --show-current              # Verify
```

**Tell user:** "Created branch `feature/ai-chat-panel`. Starting implementation."

### Scenario 2: Continuing Existing Feature

**User:** "Continue working on the chat panel from yesterday"

**Actions:**
```bash
git branch --show-current              # Check current branch
git checkout feature/ai-chat-panel     # Switch if needed
git pull origin feature/ai-chat-panel  # Get latest from remote
git log --oneline -5                   # Show recent commits
```

**Tell user:** "On branch `feature/ai-chat-panel`. Last commits: [list recent 3]"

### Scenario 3: User on Main by Mistake

**User:** "Add new feature" (but currently on main)

**Actions:**
```bash
git branch --show-current              # Shows: main

# Alert user
```

**Tell user:** "⚠️ Currently on main branch. Creating feature branch for safety."

```bash
git checkout -b feature/new-feature-name
```

### Scenario 4: Uncommitted Changes, Need to Switch

**User:** "Switch to different feature"

**Current state:** Uncommitted changes on current branch

**Actions:**
```bash
git status                             # Shows uncommitted changes
```

**Tell user:** "You have uncommitted changes. Options:
1. Commit them now
2. Stash them (save for later)
3. Discard them (if not needed)

Which would you like?"

### Scenario 5: Feature Complete, Ready to Merge

**User:** "Feature is done, ready to merge"

**Actions:**
```bash
git checkout feature/name
git log --oneline -10                  # Review commits
git checkout main
git pull origin main                   # Get latest main
git merge --no-ff feature/name -m "feat: [summary]"
git push origin main
```

**Tell user:** "Feature merged to main and pushed. Recommend deleting feature branch."

## Integration with Other Skills

**Works with:**
- `multi-phase-feature`: Creates branch at start of Phase 0
- `workspace-cleanup`: Cleans before final commit
- All skills: Ensures work happens on feature branches

## When NOT to Use This Skill

- User is fixing a typo (trivial change)
- User is reading/exploring code only
- User is running tests without changes
- User explicitly wants to work on main (rare, ask why)

## Success Criteria

✓ Feature branch created with descriptive name
✓ Branch name follows convention (type/description)
✓ Verified on correct branch before starting work
✓ Commit strategy established with user
✓ Regular commits with clear messages
✓ Work never done directly on main/master
✓ User understands branch workflow
✓ Clean history with meaningful commits
