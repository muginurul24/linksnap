# Phase 23: PayGate Core API — Full Payment Channel Integration

> **Status:** Approved by Rafi — 2026-05-09. Ready for implementation.
> **Goal:** Expand PayGate Core API from BCA bank-transfer-only to support ALL payment channels with a custom best-practice payment method selector UI — as complete as Snap, but built in-house.

---

## Why This Phase Exists

**Current state:** Hardcoded to `payment_type: "bank_transfer"` + `bank: "bca"`. User has zero choice — forced into BCA VA.

**Target state:** User sees a beautiful payment method selector, picks their preferred channel (bank VA, e-wallet, QRIS, convenience store), and gets channel-specific payment instructions. PayGate handles the backend, LinkSnap handles the UX.

**Business impact:** Higher conversion — let users pay however they want. Same completeness as Snap, but via PayGate (your own gateway on top of Midtrans Core API) with fully branded LinkSnap experience.

---

## 🔴 Phase Rules

- [ ] One commit per task after implementation starts.
- [ ] Read PRD, SECURITY, SUPERADMIN, IMPLEMENTATION, and JOURNAL before each task.
- [ ] Every state-changing browser API call must include `X-Requested-With: XMLHttpRequest`.
- [ ] Keep charting on existing Recharts + `src/components/ui/chart`.
- [ ] No raw SQL; Drizzle query builders only.
- [ ] Redis cache must be best-effort, bounded by TTL, tenant-safe.
- [ ] Never cache payment mutation results or payment method selections.
- [ ] All payment creation is server-side. User's selected method validated server-side.
- [ ] Mobile-first: payment selector must work perfectly on phone screens.

---

## 🏗️ Architecture: PayGate Multi-Channel

### Current (Single Channel)
```
UpgradeButton → POST /api/v1/payments/create
  → PayGate charge: bank_transfer, bank=bca
  → Redirect /checkout/success (VA number + copy)
```

### Target (Multi-Channel with Custom UI)
```
UpgradeButton → Payment Method Selector (modal/full-page)
  → User picks: [BCA VA] [GoPay] [QRIS] [Dana] etc.
  → POST /api/v1/payments/create { plan, duration, paymentMethod, bank? }
  → Server validates payment method
  → PayGate charge with dynamic payment_type + channel
  → Redirect /checkout/success?order_id=xxx
  → Channel-specific checkout UX:
    - Bank VA → VA number + copy + bank logo
    - E-wallet → "Open your GoPay app" + deeplink if possible
    - QRIS → QR code image (if PayGate returns QR payload)
    - Convenience store → payment code + store logo
    - Polling every 10s for status
    - Auto-redirect to billing on SETTLEMENT
```

---

## 💳 Payment Channels to Support

### Bank Transfers (Virtual Account)
| Code | Bank | Display |
|---|---|---|
| `bca` | BCA | BCA Virtual Account |
| `bni` | BNI | BNI Virtual Account |
| `bri` | BRI | BRI Virtual Account |
| `mandiri` | Mandiri | Mandiri Virtual Account |
| `permata` | Permata | Permata Virtual Account |
| `cimb` | CIMB Niaga | CIMB Niaga Virtual Account |
| `danamon` | Danamon | Danamon Virtual Account |

### E-Wallets
| Code | Wallet | Display |
|---|---|---|
| `gopay` | GoPay | GoPay |
| `ovo` | OVO | OVO |
| `dana` | DANA | DANA |
| `shopeepay` | ShopeePay | ShopeePay |
| `linkaja` | LinkAja | LinkAja |

### QRIS
| Code | Method | Display |
|---|---|---|
| `qris` | QRIS | QRIS (All apps) |

### Convenience Stores
| Code | Store | Display |
|---|---|---|
| `indomaret` | Indomaret | Indomaret |
| `alfamart` | Alfamart | Alfamart |

---

## 📋 Tasks

### 🟡 TASK 23.1 — Multi-Channel PayGate Client

**Purpose:** Expand PayGate client to support dynamic payment types, not just hardcoded BCA bank transfer.

- [ ] Update `src/lib/payments/paygate.ts`
- [ ] Define payment channel types:
  - `PaymentChannel = BankTransfer | Ewallet | Qris | ConvenienceStore`
  - `BankCode = "bca" | "bni" | "bri" | "mandiri" | "permata" | "cimb" | "danamon"`
  - `EwalletCode = "gopay" | "ovo" | "dana" | "shopeepay" | "linkaja"`
  - `CstoreCode = "indomaret" | "alfamart"`
- [ ] Update `buildPayGateChargePayload()`:
  - Accept `paymentMethod` (the channel code)
  - Map channel → `payment_type` for PayGate API:
    - Bank → `payment_type: "bank_transfer"`, `bank: code`
    - E-wallet → `payment_type: "ewallet"`, `ewallet: code`
    - QRIS → `payment_type: "qris"`
    - C-store → `payment_type: "cstore"`, `store: code`
  - Keep all other fields (amount, order_id, callback_url, items, metadata)
- [ ] Update `PayGateChargeInput` type to accept `paymentMethod` + optional `bank`/`ewallet`/`store`
- [ ] Keep `createPayGateCharge()` function signature, just richer input
- [ ] Keep `getPayGateTransaction()` as-is (used for status lookup)
- [ ] Update `PayGateChargeResponse` type to handle varied response shapes per payment type
- [ ] Error handling: if PayGate returns unsupported channel error, show clear message

**Files:**
- `src/lib/payments/paygate.ts` — Expand
- `src/lib/payments/payment-channels.ts` — New (channel types, labels, icons, groupings)
- `tests/unit/paygate-multi-channel.test.ts` — New

**Tests:**
- ✅ Unit: bank transfer payload construction per bank
- ✅ Unit: e-wallet payload construction per wallet
- ✅ Unit: QRIS payload construction
- ✅ Unit: c-store payload construction
- ✅ Unit: invalid channel → validation error
- ✅ Unit: response parsing per payment type

---

### 🟡 TASK 23.2 — Payment Method Definitions & Channel Registry

**Purpose:** Central registry of all payment channels with display metadata, icons, and grouping for UI.

- [ ] Create `src/lib/payments/payment-channels.ts`
- [ ] Define `PaymentChannel` type with all metadata:
  ```typescript
  type PaymentChannel = {
    id: string;           // e.g., "bca", "gopay", "qris"
    type: "bank_transfer" | "ewallet" | "qris" | "convenience_store";
    name: string;         // "BCA Virtual Account"
    shortName: string;    // "BCA"
    icon: string;         // Lucide icon name or SVG component name
    category: string;     // "Bank Transfer" | "E-Wallet" | "QRIS" | "Convenience Store"
    priority: number;     // Display order
    enabled: boolean;     // Can be toggled per environment
    description: string;  // "Transfer via ATM, mobile banking, or internet banking"
    instructions: string; // "Copy the VA number and complete your transfer before it expires"
  };
  ```
- [ ] Export grouped channel lists for UI:
  - `BANK_CHANNELS: PaymentChannel[]`
  - `EWALLET_CHANNELS: PaymentChannel[]`
  - `QRIS_CHANNEL: PaymentChannel`
  - `CSTORE_CHANNELS: PaymentChannel[]`
  - `ALL_PAYMENT_CHANNELS: PaymentChannel[]` (flat, sorted by priority)
  - `CHANNELS_BY_CATEGORY: Record<string, PaymentChannel[]>`
- [ ] Export helper functions:
  - `getChannelById(id: string): PaymentChannel | undefined`
  - `getChannelIcon(id: string): LucideIcon`
  - `getPaymentInstructions(channel: PaymentChannel): string`
- [ ] Use Lucide icons: `Building2` for banks, `Smartphone` for e-wallets, `QrCode` for QRIS, `Store` for convenience stores
- [ ] Color mapping per category for UI badges

**Files:**
- `src/lib/payments/payment-channels.ts` — New
- `tests/unit/payment-channels.test.ts` — New

**Tests:**
- ✅ Unit: getChannelById returns correct channel
- ✅ Unit: channel groups have correct members
- ✅ Unit: all channel IDs are unique
- ✅ Unit: priority ordering correct (banks first, then e-wallets, QRIS, stores)

---

### 🟡 TASK 23.3 — Payment Method Selector UI Component

**Purpose:** Beautiful, user-friendly payment method selector — the core UX of this phase. Users pick their preferred payment method before checkout.

- [ ] Create `src/components/payments/payment-method-selector.tsx`
- [ ] Display channels grouped by category with section headers:
  - 🏦 **Bank Transfer** — BCA, BNI, BRI, Mandiri, Permata, CIMB, Danamon
  - 📱 **E-Wallet** — GoPay, OVO, DANA, ShopeePay, LinkAja
  - 📷 **QRIS** — Scan with any app
  - 🏪 **Convenience Store** — Indomaret, Alfamart
- [ ] Each channel displayed as a tappable card/chip:
  - Icon (left)
  - Channel name (center)
  - Checkmark (right, when selected)
  - `aria-pressed` for accessibility
- [ ] Default selection: BCA (most common in Indonesia)
- [ ] Mobile: 2-column grid for bank/e-wallet, full-width for QRIS/stores
- [ ] Desktop: 3-column grid
- [ ] Selected state: primary border + light primary background
- [ ] Hover: subtle background shift
- [ ] Animate selection with spring/fade
- [ ] Search/filter input at top (optional but nice: type "bca" to filter)
- [ ] "Continue" button below — disabled until a channel is selected
- [ ] Show estimated processing time per category: "Instant" for e-wallet/QRIS, "1-2 hours" for bank transfer, "Up to 1 hour" for stores

**Files:**
- `src/components/payments/payment-method-selector.tsx` — New
- `src/components/payments/payment-channel-chip.tsx` — New
- `tests/unit/payment-method-selector.test.tsx` — New

**Tests:**
- ✅ Unit: all channels rendered in correct groups
- ✅ Unit: selecting a channel updates state
- ✅ Unit: only one channel selectable at a time
- ✅ Unit: BCA pre-selected by default
- ✅ Unit: continue button disabled when nothing selected
- ✅ Unit: channel click triggers selection
- ✅ Unit: search/filter works (if implemented)

---

### 🟡 TASK 23.4 — Upgrade Flow with Payment Selection

**Purpose:** Integrate the payment method selector into the upgrade flow. Replace the current single-click-upgrade with a two-step: pick plan → pick payment method → pay.

- [ ] Create `src/components/payments/upgrade-dialog.tsx` — Full upgrade flow dialog
  - Step 1: Plan selection (if multiple upgrade options, e.g., from Free → Pro or Business)
  - Step 2: Payment method selection (the selector from 23.3)
  - Step 3: Confirmation (plan + amount + payment method summary)
  - Step 4: Processing (spinner) → redirect to checkout
- [ ] Rewrite `src/app/(dashboard)/settings/billing/upgrade-button.tsx`
  - On click: open `UpgradeDialog` instead of directly calling API
  - Pass selected `plan` and `duration` to dialog
- [ ] Dialog behavior:
  - Animated step transitions (slide/fade)
  - Back button on step 2 and 3
  - Close button (X) with confirmation if payment not yet initiated
  - Escape key closes dialog (if payment not initiated)
  - Responsive: full-screen on mobile, centered modal on desktop
- [ ] On confirm (step 3 → 4):
  - POST `/api/v1/payments/create` with `{ plan, duration, paymentMethod, bank? }`
  - Show processing spinner, disable all buttons
  - On success: redirect to `/checkout/success?order_id=xxx`
  - On error: show error in dialog, allow retry
- [ ] Prevent double-submit throughout the flow

**Files:**
- `src/components/payments/upgrade-dialog.tsx` — New
- `src/app/(dashboard)/settings/billing/upgrade-button.tsx` — Rewrite
- `tests/unit/upgrade-dialog.test.tsx` — New
- `tests/e2e/upgrade-flow.spec.ts` — New

**Tests:**
- ✅ Unit: dialog opens on button click
- ✅ Unit: steps progress correctly
- ✅ Unit: back button works
- ✅ Unit: close with confirmation when payment initiated
- ✅ Unit: double-click prevention
- ✅ E2E: full upgrade flow from button to redirect

---

### 🟡 TASK 23.5 — Payment Create API with Channel Support

**Purpose:** Update `POST /api/v1/payments/create` to accept and validate the user's chosen payment method.

- [ ] Update `src/app/api/v1/payments/create/route.ts`
- [ ] Update `createPaymentSchema` in `src/lib/validations/payment.ts`:
  ```typescript
  const createPaymentSchema = z.object({
    duration: paymentDurationSchema,
    plan: paidPlanSchema,
    paymentMethod: z.string().min(1), // "bca", "gopay", "qris", etc.
    bank: z.string().optional(),      // Only for bank_transfer
    ewallet: z.string().optional(),   // Only for ewallet
    store: z.string().optional(),     // Only for cstore
  }).strict();
  ```
- [ ] Server-side validate `paymentMethod` against known channel registry
- [ ] Map `paymentMethod` → PayGate charge parameters:
  - `bca` → `{ payment_type: "bank_transfer", bank: "bca" }`
  - `gopay` → `{ payment_type: "ewallet", ewallet: "gopay" }`
  - `qris` → `{ payment_type: "qris" }`
  - etc.
- [ ] Return response enriched with payment method metadata:
  ```json
  {
    "orderId": "LS-...",
    "redirectUrl": "...",
    "paymentMethod": "gopay",
    "paymentType": "ewallet",
    "status": "pending",
    "vaNumbers": [...],    // for bank transfer
    "qrUrl": "...",        // for QRIS (if PayGate returns it)
    "paymentCode": "...",  // for cstore
    "expiresAt": "...",
    "instructions": "Open your GoPay app..."
  }
  ```
- [ ] Keep: auth, rate limiting, order ID generation, pending transaction record
- [ ] Keep: error handling for PayGate failures

**Files:**
- `src/app/api/v1/payments/create/route.ts` — Update
- `src/lib/validations/payment.ts` — Update schema + types
- `tests/integration/payment-create-multi-channel.test.ts` — New

**Tests:**
- ✅ Integration: create payment with BCA → VA returned
- ✅ Integration: create payment with GoPay → e-wallet response
- ✅ Integration: create payment with QRIS → QR response
- ✅ Integration: create payment with Indomaret → payment code
- ✅ Integration: invalid payment method → 400
- ✅ Integration: missing required field for channel → 400

---

### 🟡 TASK 23.6 — Checkout Success Page (Channel-Aware)

**Purpose:** Rewrite checkout success page to show channel-specific payment instructions — not just "here's a VA number".

- [ ] Rewrite `src/app/(marketing)/checkout/success/checkout-status-client.tsx`
- [ ] Payment status card with channel-specific content:

  **Bank Transfer (VA):**
  - Bank logo + "BCA Virtual Account"
  - VA number in monospace, large font, with copy button
  - "Transfer exactly RpXX.XXX before [expiration]"
  - Bank transfer instructions collapsible accordion

  **E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja):**
  - Wallet logo + "Complete payment in your GoPay app"
  - Deep link button: `gopay://...` or universal link (if supported)
  - OR instructions: "Open GoPay app → Pay → Enter amount RpXX.XXX"
  - QR code for e-wallet payment (if PayGate returns one)
  - Note: "Payment may take a few minutes to confirm"

  **QRIS:**
  - QR code image (if PayGate returns QR payload)
  - "Scan with any QRIS-supported app: GoPay, OVO, DANA, ShopeePay, LinkAja, mobile banking"
  - Amount: RpXX.XXX
  - Note: "QR code expires at [expiration]"

  **Convenience Store (Indomaret, Alfamart):**
  - Store logo + "Pay at Indomaret"
  - Payment code in monospace with copy button
  - "Show this code at the cashier"
  - Note: "Payment confirmed within 1 hour"

- [ ] Common elements (all channels):
  - Amount badge with IDR formatting
  - Order ID for reference
  - "Payment confirmed" green badge when SETTLEMENT
  - "Expires at [time]" with countdown timer when PENDING
  - Auto-polling every 10 seconds
  - Auto-redirect to billing 1.2s after SETTLEMENT detected
  - "Try Again" → back to billing if payment expired/failed

- [ ] Keep existing loading skeleton and error states

**Files:**
- `src/app/(marketing)/checkout/success/checkout-status-client.tsx` — Rewrite
- `src/components/payments/payment-instructions-va.tsx` — New
- `src/components/payments/payment-instructions-ewallet.tsx` — New
- `src/components/payments/payment-instructions-qris.tsx` — New
- `src/components/payments/payment-instructions-cstore.tsx` — New
- `tests/unit/checkout-status.test.tsx` — Update
- `tests/e2e/checkout-success.spec.ts` — New

**Tests:**
- ✅ Unit: VA display with correct bank logo, number, copy
- ✅ Unit: E-wallet display with deep link + instructions
- ✅ Unit: QRIS display with QR code
- ✅ Unit: C-store display with payment code
- ✅ Unit: SETTLEMENT → green badge + auto-redirect
- ✅ Unit: EXPIRED → error state with "Try Again"
- ✅ E2E: full checkout → success → auto-redirect flow

---

### 🟡 TASK 23.7 — Pricing Page Redesign

**Purpose:** Redesign public pricing page to showcase payment flexibility and drive upgrades.

- [ ] Rewrite `src/components/landing/pricing-page.tsx`
- [ ] Plan cards in responsive grid:
  - Free (left/subdued), Pro (center/highlighted with "Recommended" badge), Business (right/dark)
- [ ] Monthly/Yearly toggle with animated savings badge: "Save 21%"
- [ ] Each paid plan:
  - Price displayed prominently (USD + IDR approximation)
  - "Upgrade Now" CTA → redirects to `/login?callbackUrl=/settings/billing` or opens upgrade dialog if logged in
  - Feature list with checkmarks
  - If user already on this plan: "Current Plan" badge, button disabled
- [ ] Feature comparison table below cards:
  - Rows: each feature from plan definitions
  - Columns: Free, Pro, Business
  - Checkmarks/crosses with color coding
  - Sticky first column on mobile (horizontal scroll)
  - Highlight Pro column
- [ ] Trust section below comparison:
  - "All payments processed securely via Midtrans"
  - Payment method logos row: BCA, GoPay, OVO, QRIS, etc.
  - "256-bit SSL encryption"
  - Link to privacy policy / terms
- [ ] FAQ section with payment-related questions:
  - "What payment methods do you accept?" → list all channels
  - "When will my subscription activate?" → instant for e-wallet, 1-2h for bank
  - "Can I get a refund?" → 7-day policy
  - "Is my payment data stored?" → No, processed by Midtrans
- [ ] Replace "PayGate" mention with "Midtrans" (user-facing branding)

**Files:**
- `src/components/landing/pricing-page.tsx` — Rewrite
- `src/components/landing/payment-method-logos.tsx` — New (trust banner)
- `tests/unit/pricing-page.test.tsx` — Update

**Tests:**
- ✅ Unit: monthly/yearly toggle switches prices
- ✅ Unit: CTA links correct per auth state
- ✅ Unit: current plan badge shown
- ✅ Unit: all payment method logos rendered in trust section
- ✅ Unit: FAQ accordion expands/collapses

---

### 🟡 TASK 23.8 — Billing Settings Page

**Purpose:** Turn billing page into a comprehensive subscription management hub.

- [ ] Rewrite `src/app/(dashboard)/settings/billing/page.tsx`
- [ ] Current Plan Card:
  - Plan name + status badge (Active/Expiring/Past Due/Cancelled)
  - Subscription period (start → end/renewal)
  - Plan limits summary (links used/max, rules used/max)
  - If Free: "Upgrade to unlock more features" CTA
  - If Pro/Business: "Manage Plan" actions
- [ ] Available Upgrades Section:
  - For Free users: Pro and Business cards with feature highlights
  - "Upgrade" button opens `UpgradeDialog` (from 23.4)
  - For Pro users: Business card
- [ ] Payment History Table:
  - Columns: Date, Order ID, Plan, Amount, Payment Method, Status
  - Status badge: SETTLEMENT (green), PENDING (yellow), CANCEL/EXPIRE/DENY (red)
  - Payment method icon + name (e.g., GoPay logo + "GoPay")
  - Empty state: "No payment history yet"
  - Pagination if >20 entries
- [ ] Cancel Subscription:
  - Button with confirmation dialog
  - Shows effective date (end of current billing period)
  - "Your subscription will remain active until [date]"
- [ ] Reactivate Subscription (if cancelled):
  - Button to restart subscription
- [ ] Loading skeleton
- [ ] Error state with retry

**Files:**
- `src/app/(dashboard)/settings/billing/page.tsx` — Rewrite
- `src/app/(dashboard)/settings/billing/upgrade-button.tsx` — Already rewritten in 23.4
- `src/components/dashboard/billing-current-plan-card.tsx` — New
- `src/components/dashboard/billing-history-table.tsx` — New
- `src/components/dashboard/billing-manage-actions.tsx` — New
- `tests/e2e/billing-settings.spec.ts` — Update

**Tests:**
- ✅ E2E: billing page shows current plan correctly
- ✅ E2E: upgrade button opens payment selector dialog
- ✅ E2E: payment history renders with correct payment method icons
- ✅ E2E: cancel subscription confirmation dialog
- ✅ E2E: empty payment history state

---

### 🟡 TASK 23.9 — Invoice Email After Payment

**Purpose:** Professional invoice email via Resend after successful payment.

- [ ] Create `src/lib/email/invoice-email.tsx` — React Email template
  - LinkSnap logo header
  - "Payment Confirmed ✅" title
  - Invoice details table:
    - Plan: LinkSnap Pro (Monthly)
    - Amount: Rp130.000
    - Payment Method: GoPay
    - Transaction ID: xxx
    - Order ID: LS-xxx
    - Date: May 9, 2026
  - Period: May 9, 2026 – Jun 9, 2026
  - "Go to Dashboard" CTA button
  - Footer: "Powered by LinkSnap" + support email
- [ ] Trigger in webhook handler when status → SETTLEMENT
- [ ] Non-blocking: don't fail subscription activation if email fails
- [ ] Use existing Resend integration

**Files:**
- `src/lib/email/invoice-email.tsx` — New
- `src/lib/payments/paygate-webhook-handler.ts` — Add email trigger
- `tests/unit/invoice-email.test.tsx` — New

**Tests:**
- ✅ Unit: email renders all fields correctly
- ✅ Unit: email shows correct payment method (GoPay, BCA VA, QRIS, etc.)
- ✅ Unit: email period calculation correct
- ✅ Unit: handles missing optional fields (payment method)

---

### 🟡 TASK 23.10 — Security, Validation & Final Polish

**Purpose:** Ensure everything is production-grade before shipping.

- [ ] Validate `paymentMethod` against channel registry server-side (not just Zod string)
- [ ] Ensure PayGate webhook handler stores `paymentMethod` in transaction record
- [ ] Update `CACHE_POLICY.md` — ensure payment mutations remain do-not-cache
- [ ] Update `SECURITY.md` — add payment method validation note
- [ ] Add structured logging for payment creation with channel info
- [ ] Update DB schema: add `payment_method` index for query performance
- [ ] Verify all PayGate error codes are handled:
  - Channel unavailable → "This payment method is temporarily unavailable"
  - Amount mismatch → logged, not shown to user
  - Timeout → "Payment is taking longer than expected, please check your email"
- [ ] Run full quality gate:
  ```bash
  rtk bun run typecheck
  rtk bun run lint
  rtk bun run test
  rtk bun run test:e2e
  rtk bun run build
  ```
- [ ] Verify no regressions in existing payment flows

**Files:**
- Various — security + logging polish across payment files
- `_bmad-output/planning-artifacts/CACHE_POLICY.md` — Update
- `_bmad-output/planning-artifacts/SECURITY.md` — Update

**Tests:**
- ✅ All existing tests still pass
- ✅ New tests from tasks 23.1-23.9 all pass
- ✅ Production build succeeds

---

### 🟡 TASK 23.11 — End-to-End Payment Smoke Tests

**Purpose:** Comprehensive Playwright tests covering all payment channels and edge cases.

- [ ] Create `tests/e2e/payment-flow-full.spec.ts`
- [ ] Test suite covering:
  - BCA VA: select → create → checkout page with VA number + copy
  - GoPay: select → create → checkout page with wallet instructions
  - QRIS: select → create → checkout page with QR
  - Indomaret: select → create → checkout page with payment code
  - Payment method selector: search/filter works
  - Payment method selector: category groupings correct
  - Double-submit prevention on upgrade
  - Dialog close without confirming → billing page unchanged
  - Webhook settlement → subscription activated → billing reflects new plan
  - Webhook expiry → checkout shows expired state
  - Mobile viewport: selector grid adapts to 2 columns
  - Mobile viewport: checkout pages are scrollable and usable
  - Upgrade from Free → Pro (full flow)
  - Upgrade from Pro → Business (full flow)
  - Already on plan → "Current Plan" shown, button disabled
- [ ] Use Playwright fixtures for auth state

**Files:**
- `tests/e2e/payment-flow-full.spec.ts` — New

**Tests:**
- ✅ All payment channel flows pass
- ✅ All error states tested
- ✅ Mobile viewport coverage

---

## 📊 Task Summary

| Task | Area | Priority | Est. Effort |
|---|---|---|---|
| 23.1 | Multi-channel PayGate client | P0 | Medium |
| 23.2 | Channel registry & definitions | P0 | Small |
| 23.3 | Payment method selector UI | P0 | Large |
| 23.4 | Upgrade flow with payment selection | P0 | Large |
| 23.5 | Payment create API with channels | P0 | Medium |
| 23.6 | Checkout success page (channel-aware) | P0 | Large |
| 23.7 | Pricing page redesign | P1 | Large |
| 23.8 | Billing settings page | P1 | Large |
| 23.9 | Invoice email | P2 | Small |
| 23.10 | Security & final polish | P0 | Medium |
| 23.11 | E2E smoke tests | P0 | Medium |

**Total:** 11 tasks | **Implementation gate:** ✅ Rafi approved 2026-05-09.

---

## 🎨 UI/UX Reference (Mandatory for Codex)

### Payment Method Selector — Design Principles
- **Trust first.** People are about to send money. UI must feel secure, not flashy.
- **Recognition over recall.** Show bank/wallet logos, don't just list names.
- **Reduce friction.** Pre-select most common method (BCA). One tap to confirm.
- **Mobile-native.** Majority of Indo users pay via phone. Design for portrait mode.
- **Clear pricing.** Show exact amount before final confirmation.

### Checkout Success — Design Principles
- **Anxiety reduction.** User just committed money. Show immediate confirmation.
- **Channel-appropriate.** Don't show "copy VA number" for GoPay. Don't show QR for bank transfer.
- **Time pressure (gentle).** Show expiration countdown, but don't create panic.
- **Auto-refresh progress.** Show polling indicator. User shouldn't need to manually refresh.
- **Smooth transition.** When paid: celebrate, then gracefully redirect.

### Mobile Notes
- Payment selector: 2-column grid on mobile, not horizontal scroll
- Checkout page: max-width container, no horizontal overflow
- Buttons: minimum 44px touch target
- Copy button: full-width on mobile for easy tap
- Dialog: full-screen on mobile for payment flow

---

## 📝 Post-Implementation Verification

After all tasks complete, run and verify:

```bash
rtk bun run typecheck
rtk bun run lint
rtk bun run test
rtk bun run test:e2e -- tests/e2e/payment-flow-full.spec.ts
rtk bun run build
```

Manual verification checklist:
- [ ] Payment selector shows all 15+ channels grouped by category
- [ ] BCA pre-selected by default
- [ ] Selecting GoPay shows wallet instructions, not VA number
- [ ] Selecting QRIS shows QR code
- [ ] Selecting Indomaret shows payment code
- [ ] Payment history shows correct payment method icon + name
- [ ] Invoice email includes payment method
- [ ] Mobile: selector fits screen, all elements tappable
- [ ] Full upgrade flow completes without errors
