# Agent Contract: OpenClaw (Scout)

**Agent ID:** openclaw  
**Version:** 2026-04-07  
**Runner:** M2 Mac Mini (via scripts/night-shift.sh idle R&D cycle)

## Allowed Repos
- Read-only access to any repo under `/Volumes/Home/Dev/` for scouting/analysis
- Lex repo write: `docs/agent-reports/openclaw/` (scout reports only)

## Allowed File Operations
- **Read**: any file in target repos (analysis purposes)
- **Write**: only `docs/agent-reports/openclaw/<report-name>.md` in lex repo
- **Forbidden**: modifying source code, modifying project files, creating branches, opening PRs

## Allowed External Communications
- None — OpenClaw is read-only and local
- No GitHub pushes, no Slack, no email

## Scout Report Schema
Each report must include:
- `task_id`: the scouting task identifier
- `project`: target project analyzed
- `findings`: structured findings with severity (info / warning / critical)
- `recommendations`: actionable items for future Night Shift tasks
- `evidence`: file paths + excerpts supporting each finding

## Escalation Triggers
- Critical finding (security vulnerability, data loss risk) → write to ESCALATION.md and halt
- Cannot access target repo → write report with ERROR status, do not retry

## Maximum Unsupervised Runtime
- Per scout run: 600s timeout
- Triggered only during idle shift cycles (no pending tasks)

## Data Sensitivity
- Reads: source code, configuration, documentation — internal only
- Writes: analysis reports only — must NOT include secrets, API keys, .env contents
- Forbidden: reading `.env`, secrets files, credential stores
