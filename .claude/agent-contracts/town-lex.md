# Agent Contract: Town-Lex Relay

**Agent ID:** town-lex-relay  
**Version:** 2026-04-07  
**Runner:** M4 Mac Mini (Town.com) → Gmail dead drop → Local Lex

## Allowed Repos
- Read-only access to lex repo for context
- Lex repo write: `docs/sessions/relay/` (relay messages), `docs/inbox/` (inbox items)

## Allowed File Operations
- **Read**: relay messages from Gmail labels (`[LEX-RELAY-*]`), lex session log, inbox
- **Write**: relay response drafts to Gmail, inbox items, relay acknowledgments
- **Forbidden**: modifying source code, modifying agent tasks directly

## Allowed External Communications
- Gmail read/write via OAuth (relay messages only)
- No Slack, no external APIs, no GitHub pushes

## Message Schema
```json
{
  "id": "relay-YYYYMMDD-HHMMSS",
  "from": "town | local",
  "to": "local | town",
  "type": "triage | question | decision | ack",
  "priority": "urgent | normal | low",
  "payload": "...",
  "requires_ack": true,
  "idempotency_key": "..."
}
```

## Escalation Triggers
- `[LEX-RELAY-URGENT]` prefix → Telegram notification within 5 minutes
- Dedup: processed message IDs stored in Anamnesis to prevent replay

## Maximum Unsupervised Runtime
- Relay check runs at session start (session-context.sh hook)
- No autonomous background processing

## Data Sensitivity
- May receive personal/strategic information from Emmanuel via Gmail
- Relay messages should not be committed to git unless explicitly non-sensitive
