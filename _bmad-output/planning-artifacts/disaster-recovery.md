# LinkSnap Disaster Recovery

Date: 2026-05-09

## Recovery Objectives

| Target | Value |
| --- | --- |
| Primary database | Neon Postgres production root branch |
| Primary recovery mechanism | Neon instant restore / point-in-time restore |
| Secondary backup mechanism | Manual or scheduled `pg_dump -Fc` custom-format backups |
| RPO target | Within configured Neon restore window; manual dumps are supplemental |
| RTO target | Minutes for Neon instant restore; longer for `pg_restore` into a new project |

## Neon Backup Strategy

Neon supports point-in-time restore through instant restore. Restore windows vary
by Neon plan and should be set in the Neon Console for the production root
branch. For LinkSnap launch:

- Production branch must be a root branch.
- Restore window must be configured before launch.
- Use Time Travel Assist or a temporary historical branch to confirm the exact
  restore point before overwriting production.
- Remember that restore overwrites the entire branch state across all databases
  on that branch; it is not a merge.
- Neon creates a backup branch during root branch restores, which can be used to
  roll back the restore if needed.

Manual `pg_dump` backups are supplemental for compliance, provider migration, or
longer retention outside the Neon restore window.

## Manual Backup

Script:

```bash
rtk proxy env BACKUP_DATABASE_URL='postgresql://...' bash scripts/db-backup-manual.sh run
```

Dry-run:

```bash
rtk proxy env BACKUP_DATABASE_URL='postgresql://...' bash scripts/db-backup-manual.sh --dry-run
```

Rules:

- Use an unpooled Neon connection string. The script rejects `-pooler` hosts.
- Store generated `backups/db/*.dump` files outside git and with restricted
  permissions.
- Upload long-retention backups to the approved encrypted storage location.
- Never paste database URLs into logs, tickets, or commits.

## Restore From Neon PITR

1. Freeze writes if the incident is ongoing.
2. Identify the first bad write/deploy timestamp from logs, audit events, or
   payment/webhook history.
3. In Neon Console, use Time Travel Assist to inspect data before the incident.
4. Restore the production root branch from its own history to the chosen RFC3339
   timestamp.
5. Confirm Neon-created backup branch is present before accepting the restore.
6. Run:

   ```bash
   rtk bun run verify:production-env
   rtk bun run build
   rtk bun run smoke:production
   ```

7. Re-enable writes and monitor `/api/v1/health`, payment webhooks, auth, and
   redirect traffic.

## Restore From `pg_dump`

1. Create a new Neon project or clean target branch.
2. Create the target database with the same database name as the dump.
3. Use an unpooled target connection string.
4. Restore with ownership and tablespace statements ignored:

   ```bash
   rtk proxy pg_restore -v --no-owner --no-tablespaces --single-transaction -d 'postgresql://target...' backups/db/linksnap.dump
   ```

5. Run schema verification:

   ```bash
   rtk bun run verify:production-env
   rtk bun run build
   ```

6. Update Vercel `DATABASE_URL` only after the restored database is validated.

## Redeploy From Scratch

1. Provision Neon Postgres, Upstash Redis, Resend, Google OAuth, and PayGate.
2. Set Vercel production env from `.env.example` and `DEPLOY.md`.
3. Apply Drizzle migrations:

   ```bash
   rtk bun run db:migrate
   ```

4. Seed the superadmin:

   ```bash
   rtk bun run seed:superadmin
   ```

5. Run the full quality gate and production smoke.

## `DATABASE_URL` Rotation

1. Create or rotate the Neon role/password in Neon Console.
2. Copy an application connection string using pooled connection where the app
   expects pooled serverless traffic.
3. Update Vercel Production `DATABASE_URL`.
4. Trigger a production redeploy.
5. Verify `/api/v1/health`, login, link creation, redirect, analytics, and
   payment history.
6. Revoke the old role/password after verification.
7. For backups only, keep a separate unpooled `BACKUP_DATABASE_URL` in the
   operator password manager, not in Vercel unless scheduled backups need it.

## Contacts

| Area | Contact |
| --- | --- |
| Product owner | Rafi |
| Architecture/review | Claw Kun |
| Implementation/on-call | Codex session owner |
| Neon support | Neon Console support modal |
| Vercel support | Vercel project support |
| PayGate support | PayGate merchant dashboard |

## Drizzle Migration Status

Task 25.6 generated the initial Drizzle migration from
`src/lib/db/schema.ts` using:

```bash
rtk bun run db:generate
```

Generated files:

- `src/lib/db/migrations/0000_omniscient_tomorrow_man.sql`
- `src/lib/db/migrations/meta/_journal.json`
- `src/lib/db/migrations/meta/0000_snapshot.json`

This establishes a versioned schema baseline for recovery and redeploys.
