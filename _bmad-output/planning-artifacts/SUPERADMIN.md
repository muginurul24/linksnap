# Superadmin — Platform Control Center

> **Created:** 2026-05-08 | **Phase 18**

## Overview

The superadmin role grants highest-privilege access to LinkSnap. It can manage all users, view system analytics, and override plan restrictions — all with full audit trail.

## Superadmin Email

**`iqooz9xmg@gmail.com`**

## Setup Instructions

### 1. Promote a User to Superadmin

```bash
cd ~/projects/linksnap
rtk bun run seed:superadmin --email=iqooz9xmg@gmail.com
```

This is the **ONLY** way to assign the superadmin role. It cannot be done through any API endpoint.

### 2. Verify Promotion

1. Log in as the superadmin user
2. Check the sidebar — you should see an "Admin" section with Shield icon
3. Navigate to `/admin` to see the admin dashboard

## Security Rules

1. ❌ NEVER allow role change through any API endpoint — seed script only
2. ❌ NEVER skip audit logging — every admin mutation MUST write to `adminAuditLog`
3. ❌ NEVER allow superadmin to delete users — suspend only
4. ❌ NEVER trust client-side role checks — re-verify on every admin API call
5. ❌ NEVER expose superadmin role in client-side-only checks

## How It Works

### Architecture

```
Superadmin Login
    ↓
JWT callback → fetch users.role from DB → set token.role
    ↓
Session callback → propagate role to session.user.role
    ↓
PlanProvider context → resolveEffectivePlan(plan, role) → BUSINESS if superadmin
    ↓
All quota checks bypassed → superadmin sees everything
```

### Key Files

| File | Purpose |
|---|---|
| `src/lib/db/schema.ts` | `SUPERADMIN_ROLE` constant + `adminAuditLog` table |
| `src/lib/auth/superadmin-utils.ts` | `isSuperAdmin()` pure check |
| `src/lib/auth/superadmin.ts` | `requireSuperAdmin()` with auth validation |
| `src/lib/auth/session-token.ts` | JWT role propagation |
| `src/lib/links/limits.ts` | `resolveEffectivePlan()` — plan bypass |
| `scripts/seed-superadmin.ts` | Seed script |
| `src/app/api/v1/admin/*` | Admin API routes |
| `src/app/(dashboard)/admin/*` | Admin frontend pages |

### Plan Bypass

Superadmins get `BUSINESS`-equivalent access regardless of their stored plan:
- `resolveEffectivePlan("FREE", "superadmin")` → `"BUSINESS"`
- Unlimited links, link pages, campaigns, smart rules
- Full API access and rate limits

### Audit Log

All admin actions write to `adminAuditLog`:
- User plan changes: `user.plan.change`
- User suspension/unsuspension: `user.suspend` / `user.unsuspend`
- System config: `system.config`
- Admin login: `admin.login`

### Rate Limits

- Admin API routes: 30 req/min (stricter than standard)
- Admin session: re-validates role on every request (not just at login)

## Troubleshooting

### Admin nav doesn't appear after promotion
1. Sign out completely
2. Sign in again (JWT callback fetches role from DB)
3. If still missing, check that `users.role = 'superadmin'` in the database

### Cannot access admin pages
1. Verify the user is authenticated
2. Verify `session.user.role === "superadmin"`
3. Check server logs for `SUPERADMIN_REQUIRED` errors
