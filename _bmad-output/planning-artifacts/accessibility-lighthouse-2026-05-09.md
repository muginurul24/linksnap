# LinkSnap Accessibility & Lighthouse Audit — 2026-05-09

**Scope:** Phase 25.3 launch-readiness audit.  
**Build under test:** `rtk bun run build`, served locally with `next start` on `127.0.0.1:3200`.  
**Result:** Pass.

---

## Summary

- Public pages pass WCAG 2.1 A/AA Axe checks.
- Authenticated dashboard pages pass WCAG 2.1 A/AA Axe checks.
- Lighthouse desktop scores meet the ≥95 launch target for performance, accessibility, and best practices.
- Public SEO scores are 100. Private dashboard SEO is intentionally not a launch KPI because dashboard surfaces are noindex/private.
- `robots.ts`, `sitemap.ts`, public metadata, Open Graph metadata, and JSON-LD helpers are implemented and covered by unit tests.

---

## Automated Accessibility Coverage

| Surface | Tool | Routes | Result |
|---|---|---|---|
| Public pages | Playwright + Axe | `/`, `/pricing`, `/blog`, `/register` | Pass, 0 WCAG 2.1 A/AA violations |
| Authenticated dashboard | Playwright + Axe | `/dashboard`, `/links`, `/campaigns`, `/analytics` | Pass, 0 WCAG 2.1 A/AA violations |

Commands:

```bash
rtk bun run test:e2e -- tests/e2e/public-site.spec.ts
rtk bun run test:e2e -- tests/e2e/dashboard-accessibility.spec.ts
```

---

## Lighthouse Scores

Lighthouse was run with the production build via `next start`.

| Route | Mode | Performance | Accessibility | Best Practices | SEO | Status |
|---|---:|---:|---:|---:|---:|---|
| `/` | Mobile | 95 | 100 | 96 | 100 | Pass |
| `/` | Desktop | 100 | 100 | 96 | 100 | Pass |
| `/pricing` | Desktop | 100 | 100 | 96 | 100 | Pass |
| `/dashboard` | Desktop authenticated | 99 | 100 | 96 | N/A private | Pass |
| `/links` | Desktop authenticated | 100 | 100 | 96 | N/A private | Pass |
| `/campaigns` | Desktop authenticated | 99 | 100 | 96 | N/A private | Pass |
| `/analytics` | Authenticated Axe | N/A | 100 | N/A | N/A private | Pass |

Notes:

- Dashboard route SEO scores are intentionally not treated as launch failures because private app pages are protected and noindexed. Public SEO is covered by `/`, `/pricing`, sitemap, robots, and metadata unit tests.
- Lighthouse CLI could not preserve the `/analytics` authenticated route with header-based auth and reported the dashboard fallback URL instead. `/analytics` is covered by authenticated Axe E2E and remains part of the final manual walkthrough in 25.11.

Representative Lighthouse commands:

```bash
rtk bunx lighthouse http://127.0.0.1:3200/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=.tmp/lighthouse/home-mobile-rerun.json --chrome-flags="--headless --no-sandbox" --quiet
rtk bunx lighthouse http://127.0.0.1:3200/ --preset=desktop --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=.tmp/lighthouse/home-desktop.json --chrome-flags="--headless --no-sandbox" --quiet
rtk bunx lighthouse http://127.0.0.1:3200/pricing --preset=desktop --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=.tmp/lighthouse/pricing-desktop.json --chrome-flags="--headless --no-sandbox" --quiet
```

---

## SEO & Metadata

Verified by `tests/unit/seo-metadata.test.ts`:

- Marketing pages use canonical public metadata helpers.
- Home page exposes JSON-LD for organization and web app.
- `robots.ts` blocks private app/auth/API surfaces.
- `sitemap.ts` includes canonical marketing pages only.
- Public metadata includes Open Graph fields.

---

## UI Accessibility Checklist

- [x] Icon-only buttons have accessible names through `aria-label` or `sr-only` text.
- [x] Keyboard focus remains visible through shared button/input focus styles.
- [x] Dashboard and marketing layouts expose a `main` landmark.
- [x] Public forms have associated labels.
- [x] Dashboard pages tested in authenticated state with real route rendering.
- [x] Color contrast passes Axe WCAG 2.1 A/AA checks on tested surfaces.
- [x] Empty/error/loading states remain screen-reader safe and avoid raw stack output.

---

## Performance Notes

- Public hero and preview imagery use `next/image`.
- Fonts are configured globally with app layout metadata/font classes.
- No accidental large payload was found in Lighthouse; home total transfer was small enough to pass payload-size audits.
- Below-fold interactive marketing demo is the main remaining public-page JS opportunity; current scores pass, so no speculative refactor was applied.

---

## Follow-Up

Phase 25.3 is closed. Phase 25.11 should still include a human browser walkthrough of every public and dashboard page because Lighthouse/Axe cannot prove copy clarity, business logic correctness, or provider dashboard state.
