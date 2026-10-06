# Figma-first product contract

Authoritative user direction, 28 September 2026. Supersedes the earlier internal website-builder plan.

## Editing experience

Updated 4 October 2026 (user direction): Figma is the whole frontend; PassFlow is the backend.

- Figma owns all visible content, including text. PassFlow does not inject event name, date, venue or description into a Figma website; organizers type them in Figma.
- PassFlow owns Register and My Pass actions, the live ticket list (the only live block, because prices and availability change), auth, registration, tickets, credentials, SEO metadata, analytics and publishing.
- Links and motion come from native Figma prototype interactions, read at sync time:
  - On click → Open link (https only) becomes a link; On click → Scroll to becomes an in-page anchor.
  - While hovering / Mouse enter → Change to a component variant becomes a CSS hover (fill, text color, stroke, opacity, duration, easing).
- Templates: Blank, Minimal and Festival, each with Desktop 1440, Tablet 834 and Mobile 390 frames. Starters include a sticky navbar, hover button variants and scroll-entrance animations as working examples.
- Visual parity: any Google font family, alpha colours, frame photo fills, linear/radial gradients, drop/inner shadows and mixed-style text carry over. Sync uploads images to the public event-assets bucket (content-hash paths). Blurs, masks and angular/diamond gradients are flagged for review.
- Motion: hover from "While hovering → Change to" variants, plus per-layer entrance animations (fade, slide up, scale) on CSS scroll timelines. Animations are skipped under reduced motion.
- The plugin binds only Register, My Pass, live Tickets and a fallback Custom Link. Older text bindings still render for existing drafts.
- Pages: frames carry a page name. Home is required. "ticket" renders above the PassFlow sign-up form at /e/[slug]/claim, where the form itself stays PassFlow-owned. Other lowercase names render at /e/[slug]/[page], with up to 8 extra pages. Route names (claim, calendar, api, admin and similar) are reserved. Prototype Navigate to a page frame becomes a link to that page.
- Passes (optionally per ticket category): ID card, digital pass and wristband frames at any size from 10 mm to 2 m per side (presets 54×85.6, 70×120 and 240×25 mm), designed at 4 px per mm, sync as private pass drafts. Only marked attendee layers (name, photo, ticket category, code, QR) are dynamic. Wristbands are printed unclaimed and claimed later by QR, so they carry only the QR and credential code. Everything else exports as a background at about 300 dpi. Publishing runs the existing print validation (exactly one QR, square, at least 15 mm, clear of other layers).
- The legacy account OAuth/URL sync was retired on 4 October 2026. Event subdomains serve extra pages at /<page>.
- Sync is publish (6 October 2026). Only a missing Register action/live Tickets list or a QR that would not scan blocks a Sync; other problems (layers outside the frame, broken links, duplicate bindings) go live as warnings. Every issue carries the Figma node so the plugin selects it.
- Ticket and Pass pages (6 October 2026): a Figma page named `ticket` or `pass` with a Form slot / Pass slot is the whole page; PassFlow renders its live sign-up form or attendee pass inside the slot (the slot grows with its content). A Ticket page without a slot still works as a header above the default form. `/e/<slug>/pass` is not a public route.
- Breakpoints work like Framer: Desktop → Tablet → Mobile. Text, fills, strokes, effects, fonts, corner radius, opacity and visibility flow down one level; size, position, font size and spacing stay per breakpoint. A property changed directly on a smaller breakpoint becomes an override. Templates link automatically, and new layers added on a larger breakpoint (including on a Blank start) are copied to the smaller ones, scaled to their width and linked. Advanced → Link breakpoints links frames you duplicated yourself by layer name and order. Deletions do not flow down; hide a layer to hide it everywhere.
- Every public event page fades in once and shows a small "Made with PassFlow" badge. Figma sections without an entrance get a fade on scroll.
- Website parsing repairs odd layers (sub-pixel sizes, unknown links or images, orphaned parents) instead of rejecting the design; frame-level problems are reported with the frame name.
- Keep desktop, tablet and mobile frames separate. Each owns a width range (≥1200, 768–1199, <768); missing frames fall back to the nearest one, and Home without phone or tablet frames shows a readable fallback.
- Preserve stable, versioned plugin metadata for identity and bindings. Visible layer names are hints, not identifiers; renaming must not break sync.
- Produce a structured website, not a single flattened PNG.
- Figma-only design (4 October 2026). Quick Setup and the simple pass layout were removed. Until a Figma design is published, events show the PassFlow default page and the standard QR pass. Banner, logo, poster and accent color live in Settings → Branding, because cards, link previews and the pass page use them. Access holds only the credential format, claim mode and the QR codes themselves (revoke, or delete unclaimed ones). Size and layout come from the Figma pass; Access → Preview & export prints or saves each card as PNG/JPG.

## Connection and synchronization

Main flow: open Figma file, open PassFlow plugin, pair event, edit, press Sync. The website and passes update immediately.

- Organizer generates a short-lived, single-use pairing code in authenticated PassFlow.
- Pairing must verify event management permission, expire, rate-limit guesses and be revocable. A short code is not a permanent credential.
- Store non-secret event/file identity in file plugin metadata; do not expose account tokens or durable credentials in shared document metadata or source.
- Remember the linked event after pairing. Show Connected, Changes detected, Syncing, Synced, and actionable failure states.
- Edits never publish on their own: the plugin marks them "not live" until the organizer presses Sync. Serialize writes and keep unsynced changes after failures.
- Sync validates first and writes nothing on a blocking issue. Otherwise the synced row becomes the published version for its kind and ticket category, and older drafts and archived rows for that slot are deleted.
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
