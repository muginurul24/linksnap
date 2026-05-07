# Tech Spec: Individual Blog Post Pages

## Problem
The blog index lists MDX article summaries, but each card is not linked to a
readable article page. Users and crawlers need canonical `/blog/[slug]` routes
with metadata and safely rendered article content.

## Approach
- Extend the existing local MDX/frontmatter reader to load one post by slug.
- Validate slugs before resolving file paths.
- Render a safe subset of MDX/Markdown blocks through JSX instead of raw HTML.
- Add a dynamic `/blog/[slug]` page with `generateStaticParams` and
  `generateMetadata`.
- Link blog cards to their detail routes and keep the existing blog index
  design.

## Affected Files
- `src/lib/blog/posts.ts`
- `src/app/(marketing)/blog/page.tsx`
- `src/app/(marketing)/blog/[slug]/page.tsx`
- `src/app/(marketing)/blog/[slug]/loading.tsx`
- `src/lib/seo/metadata.ts`
- `tests/unit/blog-posts.test.ts`
- `tests/integration/blog-post-page.test.tsx`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] `/blog/[slug]` reads the matching MDX file from `src/content/blog`.
- [x] Unknown or invalid slugs return `notFound()`.
- [x] Frontmatter drives page metadata and OpenGraph article tags.
- [x] Content renders headings, paragraphs, lists, and code blocks as JSX.
- [x] `/blog` cards link to detail pages.
- [x] Unit and integration tests cover parsing/rendering and page output.

## Risks
- This renderer intentionally supports the current Markdown subset, not arbitrary
  executable MDX components.
- The route is filesystem-backed, so content filenames must remain slug-safe.
