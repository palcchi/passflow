# Figma-first product contract

Authoritative user direction, 28 September 2026. Supersedes the earlier internal website-builder plan.

## Editing experience

Updated 4 October 2026 (user direction): Figma is the whole frontend; PassFlow is the backend.

- Figma owns all visible content, including text. PassFlow does not inject event name, date, venue or description into a Figma website; organizers type them in Figma.
- PassFlow owns Register and My Pass actions, the live ticket list (the only live block, because prices and availability change), auth, registration, tickets, credentials, SEO metadata, analytics and publishing.
- Links and motion come from native Figma prototype interactions, read at sync time:
  - On click → Open link (https only) becomes a link; On click → Scroll to becomes an in-page anchor.
  - While hovering / Mouse enter → Change to a component variant becomes a CSS hover (fill, text color, stroke, opacity, duration, easing).
- Templates: Blank (empty Desktop 1440 and Mobile 390 frames), Minimal and Festival. Starters include a sticky navbar and hover button variants as working examples.
- The plugin binds only Register, My Pass, live Tickets and a fallback Custom Link. Older text bindings still render for existing drafts.
- Pages: frames carry a page name. Home is required. "ticket" renders above the PassFlow sign-up form at /e/[slug]/claim, where the form itself stays PassFlow-owned. Other lowercase names render at /e/[slug]/[page], with up to 8 extra pages. Route names (claim, calendar, api, admin and similar) are reserved. Prototype Navigate to a page frame becomes a link to that page.
- Drafts may sync while incomplete. Publishing requires a Register action or live Tickets list and valid scroll targets.
- Keep desktop and mobile frames separate, with a documented mobile fallback.
- Preserve stable, versioned plugin metadata for identity and bindings. Visible layer names are hints, not identifiers; renaming must not break sync.
- Produce a structured website, not a single flattened PNG.
- Keep the internal editor as Quick Setup/basic theme, not the main flow.

## Connection and synchronization

Main flow: open Figma file, open PassFlow plugin, pair event, edit, auto-sync draft, preview, explicitly publish.

- Organizer generates a short-lived, single-use pairing code in authenticated PassFlow.
- Pairing must verify event management permission, expire, rate-limit guesses and be revocable. A short code is not a permanent credential.
- Store non-secret event/file identity in file plugin metadata; do not expose account tokens or durable credentials in shared document metadata or source.
- Remember the linked event after pairing. Show Connected, Changes detected, Syncing, Synced, and actionable failure states.
- While the plugin is open, debounce changes and sync only to a private draft. Serialize writes, detect stale revisions and retain unsynced changes after failures.
- Sync never publishes. Publishing validates bindings and atomically selects an immutable public version.
- Webhooks detect out-of-session changes; they are not the main real-time sync mechanism.
- The existing account-library plugin surface is constrained by the figma-generative-plugins skill: no authenticated integration on that surface. Propose a standard Figma plugin plus scoped PassFlow pairing endpoints before implementing authenticated sync there.

## Event subdomains

- MVP: eventname.passflow.my.id, served by the same application/deployment.
- Normalize and validate requested labels; enforce case-insensitive uniqueness in the database and recheck atomically on save.
- Reserve system labels such as www, admin, api, app, login, auth, support, mail, static, assets and other infrastructure names.
- Resolve only trusted hostnames under the configured root domain. Never route arbitrary forwarded-host input to another tenant.
- Unknown/unpublished event hosts fail closed. Keep account/auth management on the canonical application origin.
- Wildcard DNS, Vercel domain attachment and TLS require explicit infrastructure/release authorization. Source implementation alone does not make the wildcard operational.
- Organizer-owned domains are a later feature; no separate deployment per event.

## Audit checkpoint

- Latest fetched main: 0d666c6. Newer navigation/avatar work overlaps the local uncommitted layout changes. Merge deliberately; preserve the user's newer sidebar and participant-presence work.
- No difference found between local base and fetched main for the Figma OAuth helper/connect/callback files.
- Production Figma log query for the preceding 24 hours on 28 September returned no matching entries. This does not establish the root cause or prove OAuth works.
- Existing account plugin: PassFlow Design, 124cc7b5-d216-4cc2-8e6e-9cf5daaa62f1. Last verified deployed source version: 16207adb07e957843d16b89f828f5d15a20dddae.
- Previous plugin update did not succeed: first build failed, then the corrected retry was blocked by the approval service usage limit. Local plugin source is not evidence of a deployed update.
- No production migrations, plugin update, push or deployment performed in this continuation.
