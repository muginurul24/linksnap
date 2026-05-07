# Tech Spec: SEO & Metadata

## Problem
Public pages need complete, consistent SEO metadata before launch. The app also
needs crawl controls, a sitemap, and structured data that describes LinkSnap as
both an organization and web application.

## Approach
Centralize site metadata, Open Graph/Twitter defaults, JSON-LD builders, and
safe JSON serialization in one SEO helper. Keep public marketing pages indexable,
mark auth and short-link redirect surfaces as noindex, and generate static
`sitemap.ts` and `robots.ts` files through Next.js metadata file conventions.

## Affected Files
- `src/lib/seo/metadata.ts`
- `src/app/layout.tsx`
- `src/app/(marketing)/**/page.tsx`
- `src/app/[slug]/page.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `tests/unit/seo-metadata.test.ts`

## Acceptance Criteria
- [ ] Every public page exports static metadata or `generateMetadata()`.
- [ ] Auth and short-link redirect pages are not indexed.
- [ ] Sitemap includes only canonical marketing URLs.
- [ ] Robots disallows API, dashboard, auth, and app-private paths.
- [ ] JSON-LD safely escapes `<` and includes Organization + WebApplication.
- [ ] Typecheck, lint, tests, and build pass.

## Risks
- Accidentally indexing auth or short-link redirect pages.
- Duplicating metadata fields and letting page metadata drift.
- Introducing unsafe JSON-LD serialization.
