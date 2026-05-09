# Phase 24: Dashboard UX Completion — User-Friendly Across All Pages

> **Status:** Draft for Rafi review. Ready for implementation after Phase 23.
> **Date:** 2026-05-09
> **Goal:** Every dashboard page must be self-explanatory, actionable, and show real meaningful data. No user should land on a page and wonder "what do I do here?"

---

## Why This Phase Exists

Audit of all 19 dashboard pages revealed significant UX gaps. Several pages are bare-bones (Campaigns shows no click data, Admin Dashboard shows dashes), others lack cross-navigation (Link Pages don't link to analytics), and new users get no onboarding guidance.

**Current state:** Users can create links, pages, campaigns, and QR codes — but they can't easily understand performance, navigate between related features, or discover what to do next.

**Target state:** Every dashboard page shows real data, provides clear next actions, links to related features, and guides new users with contextual onboarding. The dashboard feels like a cohesive product, not disconnected pages.

---

## 🔴 Phase Rules

- [ ] One commit per task after implementation starts.
- [ ] Read PRD, SECURITY, SUPERADMIN, IMPLEMENTATION, and JOURNAL before each task.
- [ ] Every state-changing browser API call must include `X-Requested-With: XMLHttpRequest`.
- [ ] No raw SQL; Drizzle query builders only.
- [ ] Mobile-first: all pages must work on phone screens.
- [ ] Existing shadcn/ui components only. No new UI framework.
- [ ] Charts use existing Recharts integration.

---

## 📋 Tasks

### 🟡 TASK 24.1 — Campaign Detail Analytics Page

**Purpose:** `/campaigns/[id]` — A full analytics dashboard for a single campaign. This is the biggest missing page.

- [ ] Create `src/app/(dashboard)/campaigns/[id]/page.tsx` — Server component
- [ ] Redirect unauthenticated users to login
- [ ] Load campaign details via `findCampaignById()` — verify ownership
- [ ] Call campaign analytics API: `GET /api/v1/campaigns/[id]/analytics`
- [ ] Display:
  - **Header:** Campaign name + slug + status badge + "Edit" button
  - **KPI Row:** Total Clicks, Unique Visitors, Links, CTR (CTA clicks / page views)
  - **Click Trend Chart:** Area chart, daily click trend (Recharts, 7d default)
  - **Top Links Table:** Top 5 performing links with clicks + destination
  - **Device Breakdown:** Pie or horizontal bar
  - **Geo Breakdown:** Top countries + cities
  - **Referrer Breakdown:** Top referrers
  - **Link Page Funnel:** Views → CTA Clicks → CTR (if campaign has link pages)
  - **Comparison Selector:** Compare with other campaigns (dropdown multi-select)
  - **Date Range:** 7D / 30D segmented control, or custom range
  - **Export CSV:** Download campaign analytics as CSV
- [ ] Empty state: "No clicks yet for this campaign. Share your links to start collecting data."
- [ ] Loading skeleton
- [ ] Error state with retry
- [ ] Add `loading.tsx` and `error.tsx` in `campaigns/[id]/`

**Files:**
- `src/app/(dashboard)/campaigns/[id]/page.tsx` — New
- `src/app/(dashboard)/campaigns/[id]/loading.tsx` — New
- `src/app/(dashboard)/campaigns/[id]/error.tsx` — New
- `src/components/campaigns/campaign-analytics-client.tsx` — New
- `tests/e2e/campaign-analytics.spec.ts` — New

**Tests:**
- ✅ E2E: campaign detail loads with KPI cards
- ✅ E2E: empty campaign shows guidance
- ✅ E2E: comparison with other campaign works
- ✅ E2E: date range changes update data
- ✅ E2E: CSV export downloads
- ✅ E2E: mobile viewport

---

### 🟡 TASK 24.2 — Campaign Cards with Performance Metrics

**Purpose:** Redesign `/campaigns` cards to show real performance data, not just link count.

- [ ] Update `src/app/(dashboard)/campaigns/page.tsx`
- [ ] Enrich campaign list query to include click aggregates:
  - Total clicks per campaign (from click_events JOIN)
  - Clicks in last 7 days
- [ ] New card design:
  - Campaign name + slug (keep)
  - **KPI row:** Total Clicks, Links, 7-Day Clicks (3 mini stats)
  - **Mini sparkline:** 7-day click trend (tiny Recharts sparkline, height ~40px)
  - **CTA:** "View Analytics" → `/campaigns/[id]`
  - Keep: Edit link in dropdown
- [ ] Make entire card clickable → navigate to `/campaigns/[id]`
- [ ] Empty state: "No campaigns yet. Create a campaign to group links and track performance together."
- [ ] Search/filter campaigns by name
- [ ] Sort options: Most Clicks, Most Links, Newest (default)
- [ ] Loading skeleton for cards (keep existing)

**Files:**
- `src/app/(dashboard)/campaigns/page.tsx` — Rewrite
- `src/lib/db/queries/campaigns.ts` — Add click aggregate queries
- `src/components/campaigns/campaign-sparkline.tsx` — New (tiny chart)
- `tests/unit/campaign-cards.test.tsx` — Update

**Tests:**
- ✅ Unit: cards show real click counts
- ✅ Unit: sparkline renders with data
- ✅ Unit: empty state renders correctly
- ✅ Unit: sorting works

---

### 🟡 TASK 24.3 — Campaign → Links Cross-Navigation

**Purpose:** Link everything together. Campaign detail page should let users manage links directly.

- [ ] Add "Manage Links" section to campaign detail page (24.1)
- [ ] Show campaign links table:
  - Slug, destination, clicks, status
  - Quick actions: Edit, Remove from campaign
  - "Add Links" button → opens link picker dialog
- [ ] Link picker dialog:
  - Search user's uncampaigned links
  - Multi-select with checkboxes
  - Preview UTM preview before adding
  - "Add to Campaign" → POST `/api/v1/campaigns/[id]/links`
- [ ] After adding links: refresh links table + refresh analytics
- [ ] Remove link with confirmation

**Files:**
- `src/components/campaigns/campaign-links-table.tsx` — New
- `src/components/campaigns/add-links-dialog.tsx` — New
- `src/app/(dashboard)/campaigns/[id]/page.tsx` — Update
- `tests/e2e/campaign-links-management.spec.ts` — New

**Tests:**
- ✅ E2E: add links to campaign
- ✅ E2E: remove link from campaign
- ✅ E2E: search uncampaigned links
- ✅ E2E: UTM preview shown before adding

---

### 🟡 TASK 24.4 — Link Pages → Analytics Cross-Navigation

**Purpose:** Link Pages cards should link to per-link analytics, not just sit there.

- [ ] Update `src/app/(dashboard)/pages/page.tsx`
- [ ] Add clickable card behavior → navigate to link analytics
- [ ] Add "View Analytics" button/icon on each card → `/analytics?linkId=xxx` or `/links/[slug]`
- [ ] Add performance sparkline per Link Page (7-day page views)
- [ ] Add CTA click-through rate badge (e.g., "CTR 12%")
- [ ] Empty state: "No Link Pages yet. Create a short link and enable its Link Page section."
- [ ] Loading state for cards
- [ ] Error state if query fails

**Files:**
- `src/app/(dashboard)/pages/page.tsx` — Update
- `src/lib/db/queries/links.ts` — Add per-page click aggregate
- `tests/unit/link-pages-list.test.tsx` — Update

**Tests:**
- ✅ Unit: cards navigate to analytics
- ✅ Unit: sparkline renders
- ✅ Unit: CTR badge visible

---

### 🟡 TASK 24.5 — QR Codes Page Enhancement

**Purpose:** QR codes page needs purpose — show QR performance, not just download buttons.

- [ ] Update `src/app/(dashboard)/qr/page.tsx`
- [ ] Enrich QR list with analytics:
  - QR scans count (click events with `referrer = 'qr'`)
  - Scans in last 30 days
  - Last scan date
- [ ] Add card enhancements:
  - QR preview (thumbnail size, clickable to download)
  - Scan count badge
  - "View Analytics" link
- [ ] Add filter: "Most Scanned", "Recently Created"
- [ ] Add "Download All QRs" button (batched as ZIP or individual)
- [ ] Empty state: "No QR codes yet. Create a link to generate one."
- [ ] Keep existing download per-format buttons

**Files:**
- `src/app/(dashboard)/qr/page.tsx` — Update
- `src/lib/db/queries/links.ts` — Add QR scan aggregates
- `tests/unit/qr-list.test.tsx` — Update

**Tests:**
- ✅ Unit: cards show scan counts
- ✅ Unit: filter switches correctly
- ✅ Unit: empty state renders

---

### 🟡 TASK 24.6 — My Links Table Sorting & Bulk Actions

**Purpose:** Links table needs sorting and bulk operations for power users.

- [ ] Update `src/app/(dashboard)/links/page.tsx`
- [ ] Add sortable column headers:
  - Slug (default), Destination, Clicks, Created, Status
  - Click header to sort ASC/DESC
  - Show sort indicator arrow
- [ ] Add bulk actions:
  - Checkbox per row + "Select All" checkbox
  - Bulk actions bar appears when ≥1 selected:
    - "Add to Campaign" → opens campaign picker
    - "Delete Selected" → confirmation dialog
    - "Export Selected CSV"
  - Bulk actions hidden when nothing selected
- [ ] Add "Last 7 Days Clicks" column (mini trend indicator)
- [ ] Keep: search, pagination, per-row actions

**Files:**
- `src/app/(dashboard)/links/page.tsx` — Update
- `src/app/api/v1/links/bulk/route.ts` — New (bulk operations)
- `src/components/links/links-bulk-actions.tsx` — New
- `tests/e2e/links-bulk-actions.spec.ts` — New

**Tests:**
- ✅ E2E: sort by clicks works
- ✅ E2E: bulk delete with confirmation
- ✅ E2E: bulk add to campaign
- ✅ E2E: select all / deselect

---

### 🟡 TASK 24.7 — Admin Dashboard Real Data

**Purpose:** Replace static dashes and "Loading..." text with real platform metrics.

- [ ] Update `src/app/(dashboard)/admin/page.tsx`
- [ ] Convert to server component with real data loading
- [ ] Query admin stats from DB:
  - Total users (count from users table)
  - Total links (count from links table)
  - Total clicks (count from click_events)
  - Revenue (sum from transactions WHERE status = 'SETTLEMENT')
  - New users today, new links today (optional)
- [ ] Show real numbers in KPI cards (replace `—`)
- [ ] Recent audit log: show last 5 entries from audit_log table
- [ ] Quick actions: keep existing (Manage Users, Audit Log, System Analytics)
- [ ] Loading skeleton
- [ ] Error state if query fails

**Files:**
- `src/app/(dashboard)/admin/page.tsx` — Rewrite
- `src/lib/db/queries/admin.ts` — Add dashboard overview query (if not exists)
- `tests/unit/admin-dashboard.test.tsx` — New

**Tests:**
- ✅ Unit: KPI cards show real numbers
- ✅ Unit: recent audit log entries render
- ✅ Unit: loading skeleton renders

---

### 🟡 TASK 24.8 — Dashboard Onboarding for New Users

**Purpose:** New users with zero data see guidance instead of empty charts.

- [ ] Update `src/app/(dashboard)/dashboard/page.tsx` and client component
- [ ] When user has 0 links:
  - Show onboarding card instead of empty chart area
  - **Step 1:** "Create your first short link" → button to `/links/new`
  - **Step 2:** "Enable Link Page" → explanation + screenshot/illustration
  - **Step 3:** "Share and track" → example of analytics
  - Checklist with completion state (tracked via localStorage or user metadata)
- [ ] When user has links but 0 clicks:
  - Show "Waiting for clicks..." with share link CTA
  - Copy-to-clipboard for first link's short URL
- [ ] When user has data: show normal dashboard (keep current)
- [ ] Remove onboarding when user completes all steps or dismisses

**Files:**
- `src/app/(dashboard)/dashboard/dashboard-overview-client.tsx` — Update
- `src/components/dashboard/onboarding-checklist.tsx` — New
- `src/lib/db/queries/dashboard.ts` — Check if user has any clicks
- `tests/unit/dashboard-onboarding.test.tsx` — New

**Tests:**
- ✅ Unit: zero-link user sees onboarding
- ✅ Unit: zero-click user sees share CTA
- ✅ Unit: normal user sees normal dashboard
- ✅ Unit: dismiss works

---

### 🟡 TASK 24.9 — Global Cross-Navigation Polish

**Purpose:** Every dashboard page should link to related pages. User should never feel "stuck".

- [ ] Audit and add cross-links across all pages:
  - **My Links** → "View Analytics" button per row → `/analytics?link=xxx`
  - **Link Pages** → card click → `/links/[slug]/edit`
  - **QR Codes** → "View Link" → `/links/[slug]/edit`
  - **Campaigns** → card click → `/campaigns/[id]`
  - **Analytics** → "Manage Links" → `/links`
  - **Settings** → "Upgrade Plan" → `/settings/billing` (for Free users)
  - **Billing** → "View Usage" → `/dashboard`
- [ ] Add breadcrumb navigation to deep pages:
  - `/campaigns/[id]/edit` → "Campaigns > Campaign Name > Edit"
  - `/links/[slug]/edit` → "My Links > slug > Edit"
- [ ] Add "Back to [parent]" links where applicable

**Files:**
- Multiple pages (small updates across ~10 files)
- `src/components/dashboard/page-breadcrumb.tsx` — New

**Tests:**
- ✅ E2E: cross-links navigate correctly
- ✅ E2E: breadcrumbs render correctly

---

### 🟡 TASK 24.10 — Final Polish: Loading, Empty, Error States Pass

**Purpose:** Ensure every dashboard page has proper loading, empty, and error states. No bare pages.

- [ ] Audit every dashboard `page.tsx` for:
  - ✅ `loading.tsx` exists (skeleton)
  - ✅ `error.tsx` exists (friendly error + retry)
  - ✅ Empty state handled (guidance + CTA)
  - ✅ Data state handled (real content)
- [ ] Fix any missing states
- [ ] Ensure all ErrorBoundary components show:
  - Friendly message (not "Internal Server Error")
  - Request ID (for debugging)
  - Retry button
  - Navigation fallback (go to dashboard)
- [ ] Standardize skeleton components:
  - Consistent card skeleton across pages
  - Pulse animation
  - Match real content layout

**Files:**
- `src/app/(dashboard)/**/loading.tsx` — Create missing ones
- `src/app/(dashboard)/**/error.tsx` — Create missing ones
- `src/components/dashboard/loading-states.tsx` — Expand

**Tests:**
- ✅ E2E: every page handles loading state
- ✅ E2E: every page handles error state
- ✅ E2E: every page handles empty state

---

## 📊 Task Summary

| Task | Area | Priority | Est. Effort |
|---|---|---|---|
| 24.1 | Campaign detail analytics page | P0 | Large |
| 24.2 | Campaign cards with metrics | P0 | Medium |
| 24.3 | Campaign links cross-navigation | P0 | Medium |
| 24.4 | Link Pages → analytics | P1 | Medium |
| 24.5 | QR Codes page enhancement | P1 | Medium |
| 24.6 | Links table sorting & bulk | P2 | Large |
| 24.7 | Admin dashboard real data | P0 | Small |
| 24.8 | Dashboard onboarding | P1 | Medium |
| 24.9 | Global cross-navigation | P1 | Medium |
| 24.10 | Loading/empty/error pass | P0 | Medium |

**Total:** 10 tasks

---

## 🎨 UX Principles (Reference for Codex)

### Every Page Must Answer These Questions
1. **What is this page?** → Clear title + description
2. **What can I do here?** → Clear CTA buttons
3. **What's my performance?** → Real metrics, not placeholders
4. **Where do I go next?** → Cross-navigation links
5. **What if there's nothing?** → Empty state with guidance
6. **What if something breaks?** → Error state with retry

### Empty State Pattern
```
[Icon]
No campaigns yet.
Create a campaign to group links and track performance together.
[Create Campaign →]
```

### Data State Pattern
```
[KPI Cards: Total, Clicks, Growth]
[Chart: Trend over time]
[Table: Top items with actions]
[Cross-link: View all →]
```

### Navigation Heuristics
- Clicking a card → detail page (not random)
- Clicking a table row → detail/edit page
- "View Analytics" should always be one click away
- Breadcrumbs on pages 2+ levels deep
- Back button on detail/edit pages
