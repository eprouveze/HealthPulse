Gated deploy pipeline — PR flow with CI verification, auto-merge, and health check.

## Project Configuration

Before running, determine these values from the current project:

```bash
# Detect GitHub repo from git remote
REPO=$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/.*github.com[:/]\(.*\)/\1/')

# Detect pre-commit check command (prefer what's in package.json)
if grep -q '"type-check"' package.json 2>/dev/null; then
  CHECK_CMD="npm run type-check && npm run lint"
elif grep -q '"lint"' package.json 2>/dev/null; then
  CHECK_CMD="npm run lint"
elif grep -q '"check"' package.json 2>/dev/null; then
  CHECK_CMD="npm run check"
else
  CHECK_CMD=""
fi

# Detect health endpoint (check common patterns)
SITE_URL=""
if [ -f vercel.json ]; then
  # Try to find the production domain from vercel project
  SITE_URL=$(vercel inspect 2>/dev/null | grep "Production" | awk '{print $NF}' || true)
fi
HEALTH_URL="${SITE_URL:+${SITE_URL}/api/health}"
```

If detection fails, ask the user for the GitHub repo path (e.g., `goldencorpus/MyWritingTwin`).

---

This command supports two modes:

- **Default** (`/deploy`): Feature branch → PR → verify CI → merge to main → verify production → health check
- **Urgent** (`/deploy --urgent`): Commit → push directly to main → verify production (skip PR/preview)

## Parse Arguments

Check if the user passed `--urgent`. If so, skip to the **Urgent Path** section below.

---

## Default Path: PR → Verify → Merge → Production

### Step 1: Pre-commit housekeeping

1. **Session log entry:** If the project has `docs/sessions/log.md`, append a summary of this session's work.

2. **Decision log check:** If significant decisions were made, add them to `docs/decisions/log.md`.

### Step 2: Pre-commit checks

If a check command was detected, run it:

```bash
$CHECK_CMD 2>&1 | tail -5
```

If it fails, fix the issues before committing. Do NOT push code that breaks CI.

### Step 3: Commit

Stage and commit all relevant changes. Do a broader `git add .` sweep after targeted adds to catch anything missed. Exclude secrets (.env, credentials) and runtime artifacts.

### Step 4: Determine branch strategy

```bash
CURRENT_BRANCH=$(git branch --show-current)
```

**If on `main`:** STOP. Tell the user: "You're on main. Create a feature branch first, or use `/deploy --urgent` to deploy directly."

**If on a feature branch:** Continue to Step 5.

### Step 5: Push and create PR

```bash
git push -u origin "$CURRENT_BRANCH"

EXISTING_PR=$(gh pr list --head "$CURRENT_BRANCH" --repo "$REPO" --json number --jq '.[0].number' 2>/dev/null)
```

If no PR exists, create one using `gh pr create`. If a PR already exists, note the PR number.

### Step 6: Three-stage verification

Run this **in the main session** (not a subagent — subagents lack bash permissions).

```bash
echo "=== Stage 1: CI Verification ==="
echo "Waiting 90 seconds for CI..."
sleep 90

PR_NUMBER="REPLACE_WITH_ACTUAL_PR_NUMBER"

CI_OK=unknown
for attempt in 1 2; do
  CHECKS=$(gh pr checks "$PR_NUMBER" --repo "$REPO" 2>&1)
  echo "$CHECKS"

  if echo "$CHECKS" | grep -q "fail"; then
    echo "CI FAILED! Not merging."
    exit 1
  fi

  if echo "$CHECKS" | grep -q "pending\|running"; then
    if [ "$attempt" = "1" ]; then
      echo "CI still running, waiting 90 more seconds..."
      sleep 90
      continue
    else
      CI_OK=unknown
    fi
  else
    echo "All checks passed!"
    CI_OK=true
    break
  fi
done

echo ""
echo "=== Stage 2: Merging to Production ==="
gh pr merge "$PR_NUMBER" --repo "$REPO" --squash --delete-branch 2>&1
MERGE_EXIT=$?

if [ "$MERGE_EXIT" != "0" ]; then
  echo "Merge FAILED! Check for merge conflicts or branch protection rules."
  exit 1
fi

echo "PR #$PR_NUMBER merged to main."

echo ""
echo "=== Stage 3: Production Verification ==="
echo "Waiting 90 seconds for production deploy..."
sleep 90

PROD_OK=false
for i in 1 2 3; do
  RUN_JSON=$(gh run list --repo "$REPO" --limit 1 --json status,conclusion,displayTitle,databaseId 2>&1)
  RUN_CONCLUSION=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('conclusion',''))" 2>/dev/null)
  RUN_TITLE=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('displayTitle','')[:60])" 2>/dev/null)
  RUN_ID=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('databaseId',''))" 2>/dev/null)

  echo "Run: $RUN_TITLE | Conclusion: $RUN_CONCLUSION"

  if [ "$RUN_CONCLUSION" = "success" ]; then
    echo "Production deploy succeeded!"
    PROD_OK=true
    break
  elif [ "$RUN_CONCLUSION" = "failure" ]; then
    echo "Production deploy FAILED!"
    gh run view "$RUN_ID" --repo "$REPO" --log-failed 2>&1 | tail -20
    exit 1
  fi

  echo "Still building... waiting 30s (attempt $i/3)"
  sleep 30
done
```

If a health URL was detected, also run:

```bash
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>&1)
echo "Health endpoint: HTTP $HEALTH"
```

Report final status to the user.

---

## Urgent Path: Direct to Production (`/deploy --urgent`)

Use for hotfixes and time-sensitive changes. Skips PR/preview verification.

### Step 1: Pre-commit checks (abbreviated)

Run check command if available (skip session/decision logs for speed).

### Step 2: Commit

Same as default path.

### Step 3: Get to main and push

```bash
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "main" ]; then
  git checkout main
  git pull origin main
  git merge "$CURRENT_BRANCH" --no-edit
fi

git push origin main
```

### Step 4: Verify production

```bash
echo "=== URGENT: Direct to Production ==="
echo "Waiting 90 seconds for CI and deploy..."
sleep 90

DEPLOY_OK=false
for i in 1 2 3; do
  RUN_JSON=$(gh run list --repo "$REPO" --limit 1 --json status,conclusion,displayTitle,databaseId 2>&1)
  RUN_CONCLUSION=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('conclusion',''))" 2>/dev/null)
  RUN_TITLE=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('displayTitle','')[:60])" 2>/dev/null)
  RUN_ID=$(echo "$RUN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('databaseId',''))" 2>/dev/null)

  echo "Run: $RUN_TITLE | Conclusion: $RUN_CONCLUSION"

  if [ "$RUN_CONCLUSION" = "success" ]; then
    echo "Deploy succeeded!"
    DEPLOY_OK=true
    break
  elif [ "$RUN_CONCLUSION" = "failure" ]; then
    echo "Deploy FAILED!"
    gh run view "$RUN_ID" --repo "$REPO" --log-failed 2>&1 | tail -20
    DEPLOY_OK=false
    break
  fi

  echo "Still running... waiting 30s (attempt $i/3)"
  sleep 30
done
```

If health URL available, check it. If deploy failed, suggest revert:
```
git revert HEAD && git push origin main
```
