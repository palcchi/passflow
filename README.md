# PassFlow

> **One event platform. One attendee identity. One QR across physical and digital experiences.**

PassFlow adalah platform event berbasis web untuk organizer yang menggabungkan **event website, registration, attendee management, QR credential, digital pass, access control, scanner, activities, benefits, analytics, dan design workflow** dalam satu sistem multi-event.

Repository: `palcchi/passflow`

---

## Status Project

**Checkpoint: 28 September 2026**

PassFlow sudah melewati tahap prototype awal dan sekarang mempunyai foundation aplikasi, database, authentication, organizer workspace, event management, participant management, QR/access system, scanner, experience tools, profile system, serta Figma integration awal.

Fokus berikutnya bukan menambah halaman sebanyak mungkin, tetapi membuat workflow event terasa seperti satu produk yang utuh, terutama:

- menyederhanakan **Customize Event**;
- menjadikan **Figma sebagai visual design source**;
- membuat Figma integration benar-benar nyaman melalui plugin;
- memisahkan **Draft / Preview / Publish**;
- menambahkan event website berbasis **custom subdomain**;
- memperkuat scanner, access rules, lifecycle credential, dan live event operation.

### Deployment policy

PassFlow **tidak boleh membuat Vercel preview atau production deployment secara otomatis sebagai bagian dari pekerjaan biasa**.

Workflow yang digunakan:

```text
edit
→ group changes
→ review source
→ explicit approval to deploy
→ one intended deployment
```

Preview atau production deployment hanya dilakukan setelah ada instruksi eksplisit untuk deploy.

---

# 1. Product Model

PassFlow adalah **multi-event platform**.

Satu aplikasi dapat menangani banyak event:

```text
PassFlow
├── Event A
├── Event B
├── Event C
└── ...
```

Setiap event memiliki data dan konfigurasi sendiri:

- event identity;
- attendee;
- ticket/pass category;
- QR credential;
- access zone;
- scanner station;
- activity;
- benefit;
- visual appearance;
- Figma design;
- public event website;
- logs dan analytics.

Data antar event harus tetap terisolasi melalui `event_id`, authorization, dan Row Level Security.

---

# 2. Current Technology

## Frontend

- Next.js 16
- React 19.2
- TypeScript
- App Router
- Server Components + Client Components
- Tailwind CSS 4
- shadcn-style component foundation
- Motion
- Magic UI adaptations
- lucide-react

## Backend

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Server-side authorization

## QR

- `html5-qrcode`
- `qrcode`

## Hosting & Source

- GitHub
- Vercel
- `passflow.my.id`

---

# 3. Current Product Structure

## Public

```text
/
```

Main PassFlow homepage.

```text
/e/[slug]
```

Published public event page.

```text
/e/[slug]/claim
```

Attendee QR claim / digital pass flow.

```text
/scan/[stationId]
```

Operational QR scanner.

---

## Account

```text
/login
/register
/forgot-password
/account
/profile
```

Current account system includes:

- email/password authentication;
- email verification flow;
- password recovery;
- optional Google OAuth support;
- organizer role resolution from memberships;
- profile name / username;
- avatar upload;
- Figma connection status.

User-facing application copy is intended to remain **English-first**.

---

## Organizer Workspace

```text
/admin
/admin/events/new
/admin/events/[eventId]
```

Event management navigation currently uses:

```text
Overview
People
Access
Experience
Appearance
Design
Settings
```

Desktop uses a persistent workspace navigation model. Event-level navigation uses a floating rounded dock with an animated active pill.

Page navigation is designed to feel app-like:

- current content stays stable during navigation;
- active navigation bubble reacts immediately;
- incoming page content uses subtle slide-up + fade;
- avoid full-page loading flashes.

---

# 4. Current Event Features

## Overview

Organizer can work with real managed events from Supabase.

Event data includes:

- name;
- slug;
- description;
- venue;
- start / end date;
- status;
- capacity;
- attendee count;
- checked-in count;
- theme;
- QR configuration;
- logo;
- hero image;
- poster.

Published events are separated from organizer-managed drafts.

---

## People

Current People tools include:

- ticket/pass categories;
- attendee records;
- attendee search;
- attendee creation;
- CSV import flow;
- crew/event members;
- participant photos;
- attendee profile images from private storage.

Participant avatars are also surfaced in organizer event cards as compact presence previews.

Attendee photos use signed URLs from the private `attendee-photos` storage bucket rather than exposing private storage paths directly.

---

## Access

PassFlow supports two credential assignment strategies:

### Automatic

```text
Registration
→ credential created/assigned
→ digital credential available
```

Best for:

- digital pass;
- named ID card;
- attendee-specific credential.

### Claim

```text
Registration
→ attendee receives physical credential
→ attendee scans QR
→ QR bound to attendee
```

Best for:

- wristbands;
- pre-printed QR credentials;
- on-site credential distribution.

Current Access workspace includes:

- QR credential batches;
- active / unclaimed / revoked states;
- revoke flow;
- printable QR batch route;
- access zones;
- ticket-based access rules;
- scanner stations;
- station activation / standby state.

Scanner modes:

```text
CHECK_IN
ZONE_ACCESS
ACTIVITY
CLAIM
```

---

# 5. QR Identity Model

PassFlow treats the QR as a credential, not merely a picture.

Core principle:

> **One credential can be represented physically and digitally without creating two attendee identities.**

Example:

```text
ATTENDEE
   │
   └── ACTIVE QR CREDENTIAL
          ├── physical wristband
          └── digital pass
```

Important rules:

- one QR must not have multiple active owners;
- revoked QR must fail validation;
- replaced credentials remain in history;
- access decisions are validated server-side;
- scanner must not trust frontend state;
- duplicate processing must be prevented.

---

# 6. Scanner

Operational flow:

```text
QR detected
→ lock scanner
→ validate credential
→ resolve attendee
→ resolve station
→ evaluate station mode / access rule
→ write log
→ show result
→ return to camera
```

Possible results include:

```text
ACCESS GRANTED
ACCESS DENIED
INVALID PASS
ALREADY CHECKED IN
ALREADY CLAIMED
PASS REVOKED
```

Scanner UI must remain:

- fast;
- high contrast;
- readable;
- touch-friendly;
- camera-first;
- low-latency;
- minimally decorative.

---

# 7. Experience

Current event Experience tools include:

- activities;
- activity checkpoints;
- activity logs;
- benefits;
- one-time benefit claims;
- scanner station linkage.

Examples:

```text
Workshop check-in
Merchandise claim
VIP activation
Booth checkpoint
Session attendance
```

The same attendee credential should work across access, activity, and benefit flows.

---

# 8. Appearance

Event Appearance remains responsible for basic PassFlow-level branding:

- primary color;
- secondary color;
- background;
- foreground;
- surface;
- header style;
- logo;
- hero image;
- poster.

This is **Quick Setup**, not a replacement for a full visual website builder.

PassFlow should not grow into another drag-and-drop page builder when Figma already exists for that job.

---

# 9. Figma Integration Today

The repository already contains an initial Figma integration.

Current implementation includes:

- Figma OAuth connection;
- encrypted Figma token storage;
- connected account status in Profile;
- event design library;
- Figma frame/file URL sync;
- frame preview;
- design metadata;
- PassFlow dynamic markers;
- QR design options;
- ticket-specific design assets;
- Save As / export workflow.

Current manual flow is approximately:

```text
Connect Figma
→ paste Figma frame URL
→ sync
→ detect PassFlow markers
→ save design
```

This flow works as the **existing foundation**, but it is **not the final intended Customize workflow**.

---

# 10. Customize Event Direction

## Product decision

Customize follows:

> **Template-first, freedom-second.**

The default experience should not throw a normal organizer into an empty canvas and politely abandon them there.

### Default flow

```text
Customize Event
→ Start with PassFlow
→ choose template/style
→ open existing Figma file
→ run PassFlow plugin
→ install starter template
→ edit
→ auto-sync Draft
→ Preview
→ Publish
```

### Advanced flow

Experienced designers can choose:

```text
Advanced Mode
→ start blank
→ create custom layout
→ assign PassFlow elements manually
```

---

# 11. PassFlow Starter Template

A starter template should contain a useful event website structure:

```text
Hero
About
Tickets
Schedule
Speakers
Sponsors
Venue
FAQ
CTA
Footer
```

The user can then:

- move sections;
- delete sections;
- change typography;
- change colors;
- replace imagery;
- redesign components;
- create a radically different layout.

The template exists to provide structure, not to lock creativity.

---

# 12. Figma Binding Model

Layer names may remain human-readable, for example:

```text
PASSFLOW_EVENT_NAME
PASSFLOW_REGISTER
PASSFLOW_SCHEDULE
```

But **layer names must not be the primary internal binding identity**.

The intended system should use Figma plugin metadata / `pluginData`.

Conceptually:

```text
Layer name:
Register Button

PassFlow metadata:
role = register
schema = passflow.website.v1
binding = action.register
```

This allows users to rename layers without destroying PassFlow integration.

---

# 13. Figma Plugin Workflow

The intended primary flow is:

```text
Open Figma file
→ PassFlow Plugin
→ Pair Event
→ Edit
→ Auto-sync Draft
→ Preview
→ Publish
```

The old:

```text
copy link
→ paste URL
→ press sync
```

should remain only as fallback/manual import rather than the main UX.

---

## Pairing

Pairing should use a temporary code.

Example:

```text
PassFlow:
PF-82DK7

Figma Plugin:
Enter pairing code
→ Connected to Festival of Ideas 2026
```

After pairing, the Figma file remembers the PassFlow event association through plugin metadata.

No repeated copy-paste URL should be required.

---

# 14. Draft, Preview, Publish

**Sync and Publish are different operations.**

```text
Figma changes
→ PassFlow Draft
→ Preview
→ Publish
→ Live website
```

Figma edits should never silently change a live event website.

Recommended states:

```text
Synced
Changes detected
Syncing draft
Draft ready
Published
```

When the plugin is open, draft sync can use a short debounce after document changes.

Figma webhook events can later be used for background change detection, but should not be treated as the only real-time synchronization mechanism.

---

# 15. Plugin Modes

## Simple Mode

For ordinary organizers:

```text
Festival of Ideas 2026
Connected

Draft synced

Preview Website
Publish
Open PassFlow
```

No marker management required.

## Advanced Mode

For designers:

```text
Selected layer
→ Assign as
   Register
   My Pass
   Tickets
   Schedule
   Custom Link
```

---

# 16. Insert PassFlow Block

The Figma plugin should eventually provide reusable blocks:

```text
Hero
Register CTA
Ticket List
Schedule
Speaker Grid
Sponsor Grid
Venue
FAQ
Footer
```

This lets users add functional PassFlow components without rebuilding bindings manually.

---

# 17. Figma vs PassFlow Responsibilities

## Figma controls

- visual hierarchy;
- layout;
- typography;
- graphics;
- composition;
- responsive frames;
- design expression.

## PassFlow controls

- event data;
- authentication;
- registration;
- ticket data;
- attendee state;
- QR credential;
- My Pass state;
- access control;
- activities;
- benefits;
- analytics;
- SEO;
- publishing;
- domain routing.

Architecture:

```text
FIGMA
visual/layout
     ↓
PASSFLOW DESIGN SCHEMA
     ↓
PASSFLOW ENGINE
data/actions/state
     ↓
EVENT WEBSITE
```

The final integration should **not** degrade into:

```text
Figma
→ PNG
→ background image
```

The generated event website must remain functional and data-driven.

---

# 18. Responsive Website Design

Recommended Figma frames:

```text
Desktop 1440
Mobile 390
```

Tablet can be optional.

If a dedicated mobile frame is unavailable, PassFlow may attempt a responsive fallback but should surface a warning rather than pretending every desktop layout magically understands mobile design.

---

# 19. Event Subdomains

Long-term public event URLs should support:

```text
discoveries.passflow.my.id
festival.passflow.my.id
conference.passflow.my.id
```

This does **not** require purchasing a domain for every event.

One owned domain:

```text
passflow.my.id
```

can use wildcard DNS:

```text
*.passflow.my.id
```

One PassFlow application can then resolve:

```text
hostname
→ subdomain
→ event
→ published website
```

Example:

```text
discoveries.passflow.my.id
→ subdomain: discoveries
→ Event: Discoveries
```

Reserved subdomains should include names such as:

```text
www
app
admin
api
login
register
support
help
status
mail
```

Current `/e/[slug]` routing remains valid until the subdomain routing layer is implemented.

---

# 20. Future Custom Domains

A later paid/advanced capability can allow organizers to use their own domain:

```text
discoveriesfestival.com
tickets.brand.com
event.company.com
```

Proposed model:

```text
Default
eventname.passflow.my.id

Advanced / Pro
custom organizer domain
```

This is not required for the initial wildcard-subdomain release.

---

# 21. Navigation & UI Direction

PassFlow UI direction is:

- minimalist;
- editorial;
- rounded;
- monochrome base;
- selective event color;
- app-like navigation;
- floating/sticky local navigation;
- strong typography;
- restrained motion;
- responsive on desktop, iPad, and iPhone.

Magic UI-style interactions are used selectively.

Suitable examples:

- kinetic text;
- number ticker;
- text animation;
- animated list;
- avatar circles;
- marquee where meaningful;
- subtle shiny/interactive buttons;
- animated beam only when it communicates a system relationship.

Avoid:

- effects for decoration alone;
- excessive glassmorphism;
- excessive gradient;
- distracting animation;
- loading flashes between internal pages.

---

# 22. Event Theme Behavior

Organizer workspace remains primarily PassFlow-branded.

Inside event management, selected event identity may influence accents and previews, but readability must always win.

Public event pages should reflect the event's own visual identity.

Dark mode must preserve contrast and must not leave dark text on dark surfaces.

---

# 23. Data & Security Principles

Important rules:

1. Supabase is the application database.
2. User data must never be committed to GitHub.
3. Service-role credentials are server-only.
4. Organizer permissions come from trusted memberships.
5. RLS remains enabled for operational tables.
6. Access decisions must be server-side.
7. QR claim must be atomic.
8. Private attendee images use protected storage.
9. Sensitive actions must validate ownership/event scope.
10. Figma OAuth tokens must remain encrypted server-side.

---

# 24. Important Data Areas

The application currently works with data areas including:

```text
organizations
organization_members
events
event_members
ticket_types
attendees
attendee_profiles
qr_credentials
access_zones
access_rules
scanner_stations
scan_logs
activities
activity_logs
benefits
benefit_claims
event_assets
figma_connections
event_designs
```

Almost all operational event data should remain scoped by `event_id`.

---

# 25. Environment Variables

See `.env.example`.

Current application configuration includes:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Optional legacy fallback
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000

FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_TOKEN_ENCRYPTION_KEY=
```

Rules:

- never commit `.env.local`;
- never expose service-role secrets through `NEXT_PUBLIC_*`;
- Figma secret values remain server-side;
- SMTP / Google OAuth secrets belong in their intended provider configuration.

---

# 26. Local Development

```bash
git clone https://github.com/palcchi/passflow.git
cd passflow
npm install
npm run dev
```

Or, for deterministic dependency installation:

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

---

# 27. Current Near-Term Priorities

## A. Customize / Figma

- replace URL-first Figma workflow with plugin-first pairing;
- create PassFlow starter website template;
- add plugin metadata bindings;
- add temporary event pairing code;
- build draft sync lifecycle;
- separate Preview and Publish;
- support Desktop + Mobile frames;
- add Insert PassFlow Block;
- retain blank Advanced Mode.

## B. Event Website

- introduce published design snapshot;
- render functional Figma-derived layout safely;
- add dynamic PassFlow bindings;
- support custom subdomain routing;
- add SEO/share configuration.

## C. Operations

- continue hardening scanner behavior;
- improve access-rule lifecycle;
- improve credential replacement/history;
- expand live event monitoring;
- improve scanner/device status visibility;
- strengthen duplicate/fraud detection.

## D. Platform

Future candidates already considered:

- Live Event Command Center;
- Gate & Zone rules;
- scanner/device monitoring;
- background jobs;
- scheduled event automation;
- PostHog analytics/session replay/feature flags;
- Cloudflare Turnstile;
- Upstash rate limiting;
- Resend transactional email;
- Dynamic Pass lifecycle;
- Wallet Pass;
- offline scanner;
- fraud detection.

---

# 28. Product Decisions That Should Stay Stable

Unless there is a strong reason to change them:

1. PassFlow remains multi-event.
2. Next.js App Router + TypeScript remains the application foundation.
3. Supabase remains the primary database/auth/storage backend.
4. QR wristband and digital pass represent one attendee credential.
5. Scanner remains browser-based.
6. Scanner decisions are validated server-side.
7. Public event design is organizer-controlled.
8. Customize is **template-first, freedom-second**.
9. Figma is the main advanced visual editor.
10. PassFlow does not build a competing full drag-and-drop website editor.
11. Figma binding identity should use metadata, not only layer names.
12. Sync updates Draft, not Live.
13. Publish is explicit.
14. Event websites should move toward wildcard subdomains.
15. Custom organizer domains are a later capability.
16. Mobile/iPad support is required.
17. Motion must support usability rather than compete with it.
18. Vercel deployment is explicit, not something to casually trigger after every edit.

---

# 29. Handoff Summary

```text
Project:
PassFlow

Repository:
palcchi/passflow

Core:
Multi-event event platform with registration, attendees,
QR credentials, digital passes, access control, scanners,
activities, benefits, event websites, and Figma-based design.

Current stack:
Next.js 16
React 19.2
TypeScript
Supabase
Tailwind CSS 4
Motion
Magic UI adaptations
html5-qrcode
qrcode
Vercel

Current organizer event sections:
Overview
People
Access
Experience
Appearance
Design
Settings

Customize direction:
Template-first.
PassFlow plugin inserts a starter template into an existing Figma file.
Blank canvas remains Advanced Mode.
Figma nodes use plugin metadata for PassFlow bindings.
Pair event using a temporary pairing code.
Plugin auto-syncs Draft.
Preview before Publish.
Publishing is explicit.

Event website direction:
Current /e/[slug] remains available.
Target default URL:
eventname.passflow.my.id

Longer term:
custom organizer domains.

Deployment rule:
Do not trigger preview or production deployments unless explicitly requested.
```

---

## References

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Figma Developers: https://developers.figma.com
- Magic UI: https://magicui.design
- shadcn/ui: https://ui.shadcn.com
