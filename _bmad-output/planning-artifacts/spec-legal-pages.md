# Tech Spec: Legal Pages

## Problem
The public marketing site needs Terms of Service and Privacy Policy pages, with
discoverable footer links and sitemap entries before launch.

## Approach
- Add static `/terms` and `/privacy` marketing routes with public metadata.
- Use a shared legal page shell for consistent header, layout, and footer.
- Extract a reusable marketing footer and include Terms/Privacy links on landing
  and blog surfaces.
- Add both routes to the public sitemap.

## Affected Files
- `src/app/(marketing)/terms/page.tsx`
- `src/app/(marketing)/privacy/page.tsx`
- `src/components/landing/legal-page.tsx`
- `src/components/landing/marketing-footer.tsx`
- `src/components/landing/landing-page.tsx`
- `src/app/(marketing)/blog/page.tsx`
- `src/app/(marketing)/blog/[slug]/page.tsx`
- `src/lib/seo/metadata.ts`
- `tests/unit/legal-pages.test.tsx`
- `tests/unit/seo-metadata.test.ts`

## Acceptance Criteria
- [x] `/terms` renders Terms of Service content.
- [x] `/privacy` renders Privacy Policy content.
- [x] Landing and blog footers link to Terms and Privacy.
- [x] Sitemap includes `/terms` and `/privacy`.
- [x] Unit tests verify legal pages and footer links render.

## Risks
- Legal copy should still be reviewed by counsel before relying on it as final
  production legal advice.
