# PassFlow Execution Roadmap

**Baseline:** 28 September 2026  
**Repository:** `palcchi/passflow`  
**Product direction:** Event Identity & Operations Platform with Figma-based visual authoring.

This roadmap converts the current PassFlow product audit and README direction into an execution plan. It intentionally separates **reliability**, **product workflow**, and **future differentiation** so the platform does not become wide before it becomes dependable.

> Core rule: operational reliability comes before decorative expansion.

---

## Progress snapshot — 28 September 2026

The checkboxes track implemented work. Both Phase 1 and Phase 2 migrations reached production on 28 September 2026; CI ran real PostgreSQL concurrency and browser route checks. Signed-in organizer and physical scanner checks remain acceptance gates.

| Phase | Status | Evidence / remaining gate |
| --- | --- | --- |
| 1 · P0 reliability | Device sign-off | Credential, scanner and RLS tests plus real PostgreSQL concurrency pass in CI. Physical iPhone/iPad camera and signed-in UI isolation checks remain. |
| 2 · Event lifecycle | Released, operator trial pending | Draft/live settings, numbered snapshots, restore, archive and delete guards are deployed. Existing published event received version 1; organizer publish/restore trial remains. Operational tickets/gates/access edits apply immediately. |
| 3 · Customize | Partial | Quick Setup and editable Figma starter blocks exist; actual organizer trial remains. |
| 4 · Figma plugin | Partial | Plugin source, pairing and metadata bindings exist; registered plugin ID, server secret and real Figma trial remain. |
| 5 · Figma sync | Partial | Draft sync, revision checks and desktop/mobile frames exist; broader Figma node coverage remains. |
| 6 · Website runtime | Partial | Structured renderer, dynamic actions and explicit publish exist; complete dynamic section binding and SEO remain. |
| 7 · Subdomains | Partial | Mapping and hostname routing exist; wildcard DNS/TLS verification and feature flag activation remain. |
| 8 · Dashboard | Partial | Basic metrics exist; live operational feeds and reconciled aggregates remain. |
| 9 · Command Center | Not started | Incident controls and device health remain. |
| 10 · Acceptance | Partial | Unit, SQL fixture, browser routes and PostgreSQL concurrency pass; real devices, authenticated flows and load remain. |
| 11 · Scale | Not started | Deferred until P0 reliability is proven. |

---

## Priority Model

### P0 — Required before real event operations

Must be dependable before PassFlow is trusted at a real gate or live event.

- QR claim integrity
- access authorization
- RLS / event isolation
- scanner failure handling
- duplicate protection
- authentication and roles
- logs and observability
- mobile camera validation
- concurrency validation

### P1 — Product strengthening

Makes PassFlow easier to operate, publish, and differentiate.

- Figma plugin end-to-end
- Draft → Preview → Publish
- binding validation
- event website runtime
- wildcard event subdomains
- operational analytics
- asset pipeline
- manual fallbacks
- rate limits
- load testing

### P2 — Scale & differentiation

Useful after the operational core is proven.

- offline scanner
- custom organizer domains
- wallet passes
- advanced analytics
- fraud/anomaly detection
- background jobs
- richer templates
- advanced automation

---

# Phase 1 — P0 Reliability Core

**Priority:** P0

## Objective

Make credential, scanner, access, and event-isolation behavior safe enough for real event operations.

## Tasks

### QR claim & credential integrity

- [x] Audit the current QR claim transaction from request to database write.
- [x] Make QR claim atomic.
- [x] Prevent two users from claiming the same QR concurrently.
- [x] Enforce one active credential per attendee where required.
- [x] Audit credential revoke flow.
- [x] Audit credential replacement flow.
- [x] Ensure replaced/revoked credentials immediately fail validation.
- [x] Preserve credential history for audit purposes.

### Access decision

- [x] Audit every scanner validation path.
- [x] Ensure access decisions are server-side only.
- [x] Validate credential status.
- [x] Validate event ownership of the credential.
- [x] Validate scanner station.
- [x] Validate station → event relationship.
- [x] Validate station → zone relationship.
- [x] Validate ticket/pass access rules.
- [x] Validate activity/benefit context when applicable.
- [x] Reject credentials used in the wrong event/station context.

### Duplicate & race protection

- [x] Prevent repeated processing while the same scanner result is active.
- [x] Prevent duplicate check-in where policy disallows it.
- [x] Prevent duplicate one-time benefit claim.
- [x] Add concurrency tests for registration.
- [x] Add concurrency tests for QR claim.
- [x] Add concurrency tests for scanning.

### Scanner failure behavior

- [x] Camera permission denied state.
- [x] Camera unavailable state.
- [x] QR decode guidance after prolonged unreadable frames.
- [x] API timeout state.
- [x] Slow network state.
- [x] Retry behavior.
- [x] Expired session state.
- [x] Clear offline/network warning.
- [x] Automatic scanner recovery attempt after camera interruption or tab resumption.
- [x] Manual attendee lookup fallback.

### Authorization & RLS

- [x] Audit organizer permissions.
- [x] Audit staff permissions.
- [x] Audit attendee permissions.
- [x] Test Event A cannot read/write Event B data.
- [ ] Test isolation through UI paths.
- [ ] Test isolation through direct API/database paths.
- [ ] Ensure operational queries are scoped by `event_id`.
- [x] Verify service-role usage remains server-side only.

### Abuse & observability

- [x] Rate-limit claim endpoints.
- [x] Rate-limit scanner mutation endpoints.
- [x] Log credential claim.
- [x] Log credential revoke.
- [x] Log credential replacement.
- [x] Log scanner result.
- [x] Log access denial reason.
- [x] Log activity actions.
- [x] Log benefit claims.
- [x] Add useful runtime error context without leaking secrets.

## Definition of Done

- Simultaneous claim of one QR cannot create two owners.
- Event A data cannot be accessed from Event B roles.
- Revoked/replaced QR fails immediately.
- Scanner recovers from common camera/network failures.
- Every access result can be traced through logs.
- Critical decisions do not depend on editable client-side state.

---

# Phase 2 — Event Lifecycle & Publishing Foundation

**Priority:** P0 → P1

## Objective

Create a predictable lifecycle for an event so draft work, live configuration, archive behavior, and dependent data do not interfere with each other.

## Tasks

- [x] Finalize event states:
  - [x] Draft
  - [x] Published
  - [x] Archived
- [x] Define legal state transitions.
- [x] Add publish validation.
- [x] Prevent incomplete critical configuration from publishing where necessary.
- [x] Define archive behavior.
- [x] Define delete behavior.
- [x] Show dependency warnings before destructive actions.
- [x] Ensure deleting/archive operations do not accidentally remove logs required for audit.
- [x] Separate editable draft core settings and Quick Setup from live published state.
- [x] Add published version metadata.
- [x] Add basic rollback/version restore strategy.
- [x] Define what remains editable during a live event: ticket, station, zone and access operations apply immediately; basics and Quick Setup stage for publish.

## Definition of Done

- Draft edits cannot silently change live configuration.
- Archive/delete behavior is explicit and safe.
- A published version can be identified independently from the latest draft.
- Organizer can understand whether the event is Draft, Live, or Archived at a glance.

---

# Phase 3 — Customize Event v1

**Priority:** P1

## Objective

Turn Customize into a guided workflow that is useful for normal organizers while still allowing designers full freedom.

## Product Rule

> **Template-first, freedom-second.**

## Tasks

### Default experience

- [ ] Make **Start with PassFlow Template** the default path.
- [ ] Keep Quick Setup for organizers who do not want to use Figma.
- [ ] Add an explicit **Advanced Mode / Start Blank** option.
- [ ] Avoid building a competing drag-and-drop website builder inside PassFlow.

### Starter website structure

Create reusable starter sections:

- [ ] Hero
- [ ] About
- [ ] Tickets
- [ ] Schedule
- [ ] Speakers
- [ ] Sponsors
- [ ] Venue
- [ ] FAQ
- [ ] CTA
- [ ] Footer

### Template system

- [ ] Define initial template styles.
- [ ] Define required vs optional blocks.
- [ ] Define desktop frame convention.
- [ ] Define mobile frame convention.
- [ ] Define safe fallback when mobile design is missing.
- [ ] Make templates editable rather than locked.

## Definition of Done

A new organizer can create a credible event website without starting from an empty canvas, while a designer can still redesign everything.

---

# Phase 4 — Figma Plugin v1

**Priority:** P1

## Objective

Replace the current URL-first Figma workflow with a plugin-first workflow that pairs a Figma file directly to a PassFlow event.

## Target Flow

```text
Open Figma file
→ PassFlow Plugin
→ Pair Event
→ Install template or use existing design
→ Edit
→ Sync Draft
→ Preview
→ Publish in PassFlow
```

## Tasks

### Existing integration audit

- [ ] Audit current Figma OAuth flow.
- [ ] Audit encrypted token storage.
- [ ] Audit reconnect/disconnect behavior.
- [ ] Audit current Figma file/frame parsing.
- [ ] Audit current design export/save flow.

### Pairing

- [ ] Create temporary event pairing codes such as `PF-82DK7`.
- [ ] Add expiration to pairing codes.
- [ ] Pair the open Figma file to one PassFlow event.
- [ ] Store event connection metadata in plugin data.
- [ ] Allow explicit unpair/re-pair.
- [ ] Prevent a stale pairing from silently writing to the wrong event.

### Metadata binding

Do not rely only on layer names.

- [ ] Define plugin metadata namespace.
- [ ] Define schema version such as `passflow.website.v1`.
- [ ] Store semantic role in pluginData/sharedPluginData.
- [ ] Keep readable layer markers optional for humans.
- [ ] Preserve binding after layer rename.

### Assign existing layers

- [ ] Event Name
- [ ] Event Date
- [ ] Venue
- [ ] Register
- [ ] My Pass
- [ ] Tickets
- [ ] Schedule
- [ ] Speakers
- [ ] Sponsors
- [ ] Venue Map
- [ ] Custom Link

### Insert PassFlow Block

- [ ] Hero
- [ ] Register CTA
- [ ] Ticket List
- [ ] Schedule
- [ ] Speaker Grid
- [ ] Sponsor Grid
- [ ] Venue
- [ ] FAQ
- [ ] Footer

### Plugin UX

- [ ] Simple Mode for organizers.
- [ ] Advanced Mode for designers.
- [ ] Connected event state.
- [ ] Sync state.
- [ ] Validation warnings.
- [ ] Open PassFlow action.
- [ ] Preview action.

## Definition of Done

A user can open an existing Figma file, run the PassFlow plugin, pair an event once, install or assign PassFlow components, and continue designing without repeatedly copying Figma URLs.

---

# Phase 5 — Figma Sync & Design Runtime Schema

**Priority:** P1

## Objective

Convert Figma designs into a stable, safe PassFlow design representation without reducing the website to a screenshot.

## Architecture

```text
Figma
→ PassFlow Plugin / parser
→ normalized design schema
→ dynamic bindings + static design
→ PassFlow runtime
```

## Tasks

### Design schema

- [x] Define normalized PassFlow Design Schema.
- [x] Version the schema.
- [x] Support layout/frame hierarchy.
- [x] Support text.
- [x] Support image fills/assets.
- [ ] Support common auto-layout behavior.
- [ ] Support basic vector/shape representation where practical.
- [x] Define unsupported-node behavior.

### Binding

- [x] Resolve plugin metadata bindings.
- [x] Validate required actions.
- [x] Validate duplicate bindings.
- [x] Validate missing targets.
- [x] Surface unsupported/missing bindings clearly.

### Sync lifecycle

- [x] Detect Figma document changes while plugin is open.
- [x] Debounce draft sync.
- [ ] Add:
  - [x] Synced
  - [x] Changes detected
  - [x] Syncing
  - [x] Draft ready
  - [x] Error
- [x] Never auto-publish a design change.
- [x] Add conflict detection.
- [x] Define behavior when Figma and PassFlow draft both changed.
- [x] Preserve last successfully synced version.

### Responsive

- [x] Desktop frame support.
- [x] Mobile frame support.
- [ ] Optional tablet frame support.
- [x] Responsive fallback with warning when mobile frame is absent.

## Definition of Done

Figma edits can safely produce a data-driven PassFlow Draft that survives layer renames, reports validation issues, and does not modify the live site until explicitly published.

---

# Phase 6 — Event Website Runtime

**Priority:** P1

## Objective

Render event designs as real, functional websites connected to PassFlow data and actions.

## Tasks

### Runtime rendering

- [x] Render normalized design schema.
- [x] Preserve responsive layout.
- [x] Render approved static design assets.
- [x] Avoid arbitrary organizer JavaScript.
- [x] Sanitize external URLs/actions.

### Dynamic bindings

- [x] Event name.
- [x] Description.
- [x] Date/time.
- [x] Venue.
- [x] Logo/banner.
- [x] Ticket list.
- [x] Schedule.
- [x] Speakers.
- [x] Sponsors.
- [x] Register action.
- [x] My Pass action.
- [x] Auth-aware primary CTA.
- [x] Custom safe links.

### Publishing

- [x] Preview Draft.
- [x] Create immutable/identifiable published snapshot.
- [x] Publish explicitly.
- [x] Show published timestamp/version.
- [x] Add rollback path.

### SEO & sharing

- [x] Page title.
- [x] Meta description.
- [x] Social preview.
- [x] Favicon/event icon.
- [x] Canonical URL.
- [x] Search indexing control.

## Definition of Done

An event website created from Figma behaves like a real PassFlow application page, not an exported picture, and has an explicit Draft → Preview → Publish lifecycle.

---

# Phase 7 — Wildcard Event Subdomains

**Priority:** P1

## Objective

Give each published event its own memorable PassFlow URL without requiring a new deployment or a separately purchased domain.

## Target

```text
discoveries.passflow.my.id
festival.passflow.my.id
conference.passflow.my.id
```

## Tasks

- [ ] Configure wildcard domain `*.passflow.my.id`.
- [ ] Add event subdomain field/mapping.
- [ ] Add subdomain availability checker.
- [ ] Normalize subdomain input.
- [ ] Reserve platform names:
  - [ ] www
  - [ ] app
  - [ ] admin
  - [ ] api
  - [ ] login
  - [ ] register
  - [ ] support
  - [ ] help
  - [ ] status
  - [ ] mail
- [ ] Resolve hostname → event.
- [ ] Render correct published event.
- [ ] Return proper 404 for unknown subdomain.
- [ ] Keep `/e/[slug]` as fallback/legacy route initially.
- [ ] Set canonical URL to avoid duplicate SEO indexing.
- [ ] Ensure one runtime deployment serves all event subdomains.

## Definition of Done

A published event can use `eventname.passflow.my.id` and resolve to the correct event without creating a separate deployment.

---

# Phase 8 — Operational Dashboard

**Priority:** P1

## Objective

Make the organizer dashboard show what is actually happening during an event, not merely decorative metrics.

## Tasks

### Core metrics

- [ ] Total registered.
- [ ] Checked in.
- [ ] Active QR.
- [ ] Unclaimed QR.
- [ ] Revoked QR.
- [ ] Granted scans.
- [ ] Denied scans.
- [ ] Activity participation.
- [ ] Benefit claims.

### Operational state

- [ ] Recent scan feed.
- [ ] Denial reason visibility.
- [ ] Duplicate attempt indicators.
- [ ] Scanner/station last activity.
- [ ] Station active/standby state.
- [ ] Zone traffic.
- [ ] Live registration feed.
- [ ] Live check-in feed.
- [ ] Error/failure indicator.

### Data quality

- [ ] Compare dashboard counts against database truth.
- [ ] Add appropriate aggregation/indexing.
- [ ] Avoid expensive per-event N+1 queries where possible.
- [ ] Handle burst traffic.

## Definition of Done

An organizer can open the dashboard during a live event and understand registration, entry, access failures, station state, activities, and claims without reading raw database logs.

---

# Phase 9 — Live Event Command Center

**Priority:** P1 → P2

## Objective

Provide a focused operational screen for staff and organizers during event-day incidents.

## Tasks

- [ ] Live scanner/device list.
- [ ] Scanner last-seen timestamp.
- [ ] Station health state.
- [ ] Error feed.
- [ ] Access-denial feed.
- [ ] Pause/standby station.
- [ ] Disable/revoke credential quickly.
- [ ] Gate/zone quick controls.
- [ ] Incident notes/status.
- [ ] Live attendee lookup.
- [ ] Live check-in timeline.
- [ ] Permission model for event staff vs organizer.

## Definition of Done

During an operational problem, authorized staff can identify the affected station/credential and take a safe corrective action without leaving PassFlow.

---

# Phase 10 — End-to-End Acceptance & Load Testing

**Priority:** P0/P1 release gate

## Objective

Prove the whole event lifecycle works across roles, devices, concurrency, and failure conditions.

## Scenario

### Multi-event isolation

- [ ] Create Event A.
- [ ] Create Event B.
- [ ] Verify zero unintended cross-event visibility.
- [ ] Verify cross-event write attempts fail.

### Customize & publish

- [ ] Customize Event A.
- [ ] Connect/pair Figma.
- [ ] Create/update Draft.
- [ ] Confirm Draft does not alter Live.
- [ ] Preview.
- [ ] Publish.
- [ ] Verify public website.

### Attendees

- [ ] Register General attendee.
- [ ] Register VIP attendee.
- [ ] Verify ticket/pass category.

### Credentials

- [ ] Claim/assign credential.
- [ ] Simultaneously attempt the same QR claim.
- [ ] Confirm only one succeeds.
- [ ] Revoke credential.
- [ ] Replace credential.
- [ ] Confirm old QR fails.

### Access

- [ ] Main entrance valid grant.
- [ ] General attendee → VIP area denied.
- [ ] VIP attendee → VIP area granted.
- [ ] Duplicate check-in behavior correct.

### Activities & benefits

- [ ] Activity scan.
- [ ] Benefit claim.
- [ ] Duplicate one-time benefit claim rejected.

### Failure modes

- [ ] Camera permission denied.
- [ ] Camera unavailable.
- [ ] Slow network.
- [ ] Timeout.
- [ ] Retry.
- [ ] Duplicate rapid scan.
- [ ] Invalid QR.
- [ ] Revoked QR.

### Devices

- [ ] iPhone Safari.
- [ ] iPad Safari.
- [ ] Android Chrome.
- [ ] Desktop Chrome.
- [ ] Kiosk/fullscreen scanner scenario.

### Load

- [ ] Concurrent registration load test.
- [ ] Concurrent claim load test.
- [ ] Concurrent scanning load test.
- [ ] Verify dashboard remains responsive.
- [ ] Compare dashboard metrics with audit logs/database truth.

## Definition of Done

The complete event-day flow can be executed repeatedly without cross-event leakage, duplicate credential ownership, incorrect access decisions, or unrecoverable scanner failures.

---

# Phase 11 — Scale & Differentiation

**Priority:** P2

## Objective

Add capabilities that improve resilience, scale, monetization, and differentiation after the core system is proven.

## Offline Scanner

- [ ] Define offline authorization model.
- [ ] Limit credential snapshot by event/station authority.
- [ ] Store temporary local scan log.
- [ ] Sync when connection returns.
- [ ] Handle duplicate/conflict/order.
- [ ] Define offline revocation policy.
- [ ] Authorize/revoke scanner devices.

## Custom Organizer Domains

- [ ] Add custom-domain ownership flow.
- [ ] Domain verification.
- [ ] Event mapping.
- [ ] SSL/domain lifecycle.
- [ ] Canonical URL migration.
- [ ] Consider Pro/paid entitlement.

## Wallet Pass

- [ ] Apple Wallet research/implementation.
- [ ] Google Wallet research/implementation.
- [ ] Credential lifecycle updates.
- [ ] Revoke/update behavior.

## Fraud & Anomaly Detection

- [ ] Repeated credential usage signals.
- [ ] Suspicious station/location patterns.
- [ ] Rapid replay detection.
- [ ] Organizer alerts.
- [ ] Audit-friendly evidence.

## Platform Infrastructure

- [ ] Background jobs.
- [ ] Scheduled event automation.
- [ ] Transactional email pipeline.
- [ ] Product analytics/session replay.
- [ ] Bot protection.
- [ ] Rate-limit infrastructure.
- [ ] Advanced operational analytics.
- [ ] Richer template/design system.
- [ ] Feature flags where useful.

## Definition of Done

P2 features improve the already-stable event platform without weakening the operational core or turning the product into a pile of partially completed integrations.

---

# Execution Order

The intended order is:

```text
Phase 1  P0 Reliability Core
   ↓
Phase 2  Event Lifecycle
   ↓
Phase 3  Customize Event v1
   ↓
Phase 4  Figma Plugin v1
   ↓
Phase 5  Figma Sync / Design Schema
   ↓
Phase 6  Event Website Runtime
   ↓
Phase 7  Event Subdomains
   ↓
Phase 8  Operational Dashboard
   ↓
Phase 9  Command Center
   ↓
Phase 10 End-to-End Acceptance
   ↓
Phase 11 Scale & Differentiation
```

Phase 10 is not merely the final QA phase. Relevant acceptance tests should also be added continuously while Phases 1–9 are implemented.

---

# Current Working Focus

The next implementation focus should remain:

```text
P0 reliability audit
→ event lifecycle
→ Customize Event
→ Figma Plugin
→ Draft / Preview / Publish
→ event subdomain
→ operational dashboard
```

Do not jump to offline scanner, custom domains, Wallet Pass, or advanced fraud detection before the gate/scanner/credential core is proven.

---

# Deployment Rule

Automatic Vercel Git deployments are disabled for this repository.

Development workflow:

```text
code changes
→ grouped review
→ merge as appropriate
→ explicit deployment request
→ intended deployment
```

Do not create preview or production deployments as an automatic side effect of routine source changes.

---

# Product Positioning

Working positioning:

> **PassFlow is the operating layer for modern events. Design freely in Figma, manage identity, access, and experiences in one place.**

Campaign/design-facing line:

> **Design your event in Figma. Run the entire event in PassFlow.**

PassFlow should not be positioned primarily as ticketing. Ticketing is an entry point. The larger product value is the combination of **event identity, design, credentialing, access, and operations**.
