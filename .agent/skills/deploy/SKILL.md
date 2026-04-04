---
name: deploy
description: >
  Gated deploy pipeline. Use when the user says "deploy", "$deploy",
  or asks to push changes to production. Handles PR creation, CI
  verification, merge, and production health check.
---

# Deploy Skill

Gated deploy pipeline - PR flow with CI verification, auto-merge, and
health check. Supports default (PR) and urgent (direct push) modes.

## Detect Mode

- User says "urgent" or "--urgent" -> URGENT mode (skip PR)
- Otherwise -> DEFAULT mode (feature branch -> PR -> verify -> merge)

## Project Detection

```bash
REPO=$(git remote get-url origin | sed 's/.*github.com[:\/]\(.*\)\.git/\1/' | sed 's/.*github.com[:\/]\(.*\)/\1/')
CURRENT_BRANCH=$(git branch --show-current)
```

Detect check command from package.json (type-check, lint, check).
If detection fails, ask the user for the GitHub repo path.

## Default Path: PR -> Verify -> Merge

1. **Pre-commit checks**: Run detected check command. Fix issues before committing.
2. **Commit**: Stage and commit all relevant changes.
3. **Branch check**: If on `main`, STOP and tell user to create a feature branch.
4. **Push and create PR**: `git push -u origin "$CURRENT_BRANCH"`, then `gh pr create`.
5. **Three-stage verification**:
   - Stage 1: Wait 90s, check CI with `gh pr checks`
   - Stage 2: Merge with `gh pr merge --squash --delete-branch`
   - Stage 3: Wait 90s, verify production deploy with `gh run list`
6. **Health check**: If health endpoint detected, `curl` it.

## Urgent Path: Direct to Production

1. Pre-commit checks (abbreviated)
2. Commit
3. Merge to main: `git checkout main && git pull && git merge "$CURRENT_BRANCH"`
4. Push: `git push origin main`
5. Verify production deploy (same as Stage 3 above)

## Safety

- Never force-push to main
- Always run pre-commit checks
- If CI fails, do NOT merge
- If production deploy fails, suggest: `git revert HEAD && git push origin main`
