---
name: db-migrate
description: "Run HealthPulse Drizzle migrations safely. Generates SQL from src/lib/schema.ts (db:generate) and applies it to weight-tracker.db (db:migrate), but only after verifying a .db backup exists. Use when the user says '/db-migrate', 'run migrations', 'apply schema changes', or 'migrate the database'."
disable-model-invocation: true
user_invocable: true
---

# /db-migrate — Safe Drizzle Migration

Generate and apply HealthPulse database migrations with a mandatory backup pre-check.

This project uses Drizzle (SQLite). Schema lives in `src/lib/schema.ts`, the DB file is
`./weight-tracker.db`, generated SQL goes to `./drizzle/`, and backups live in `./backups/`.

## Steps

### 0. Backup pre-check (MANDATORY — do not skip)

A `.db` backup MUST exist before migrating. Check `./backups/`:

```bash
ls -1 backups/*.db 2>/dev/null
```

- If at least one `*.db` file exists, note the most recent one and proceed.
- If NONE exists, create one first and confirm it succeeded:

```bash
mkdir -p backups
cp weight-tracker.db "backups/weight-tracker-$(date +%Y-%m-%dT%H-%M-%S).db"
ls -1 backups/*.db
```

Do not run any migration step until a backup file is confirmed present.

### 1. Generate migration SQL

```bash
npm run db:generate
```

This reads `src/lib/schema.ts` and writes a new SQL file into `./drizzle/`.
Show the user the newly generated file and its contents before applying.

### 2. Apply the migration

```bash
npm run db:migrate
```

### 3. Report

Report which backup protected the run, the generated SQL filename, and the migrate output.
If `db:migrate` fails, tell the user the backup path so they can restore with
`cp <backup> weight-tracker.db`.
