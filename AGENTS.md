<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## PassFlow user preferences
- Updated 28 September 2026: work and verify source changes locally in batches. Never create a Vercel preview or production deployment without an explicit deployment instruction. "Good response", "bagus", "oke", and "lanjut" are not deployment authorization. Do not push a branch that could trigger deployment without explicit release authorization. Respect repository checks and branch protection.
- Product direction: template-first Figma customization, not a competing internal website builder. Since 4 October 2026 design is Figma-only: Quick Setup and the simple pass layout were removed; events show a PassFlow default page and standard QR pass until a Figma design is published, and banner/logo/poster/accent live in Settings → Branding. Figma owns visuals, typography, graphics, and desktop/mobile layouts; PassFlow owns authenticated data, registration, tickets, QR, SEO, analytics, and publishing. Since 6 October 2026 pressing Sync in the plugin publishes immediately (no drafts); blocking issues are refused and located in Figma. See docs/figma-product-contract.md before continuing the design overhaul.
- Visual direction: clean monochrome white/gray surfaces, Apple system typography with large bold/light editorial headings, rounded event cards, and small colorful folder/ticket/sticker artwork. Keep kinetic event headings and a restrained moving homepage tagline. Apply this consistently to auth, profile, dashboards, and event management; preserve organizer-selected public event and digital pass colors.
