# Phase 5–6 delivery audit

- Figma plugin exports schema 3 nested frames, local coordinates, bindings in plugin metadata, and rasterized leaf artwork. Schema 2 documents remain readable. Draft sync is debounced and never publishes.
- Preview/live renderer uses event data for identity, ticket list, schedule, speakers, sponsors and actions. Organizer edits structured content under Design → Website content. Published design snapshots have timestamps and sequential publication numbers; Restore copies a snapshot into a new draft for review and explicit republish.
- Dynamic event metadata includes canonical, search control, title, description, event logo icon and social preview; route generates a fallback OG image.
- Database migrations: exclusive pairing, runtime content, restore publication. The first two were applied before workspace recovery; the restore function was applied during this release.
- Checks: typecheck, lint, build, Figma parser/plugin tests. Local browser smoke test requires a Chromium binary absent from this environment.
- Remaining: complex Figma auto layout is captured at one size, masked/effect-heavy art and larger image assets need a dedicated asset pipeline, tablet is a fallback, and a real organizer Figma file plus authenticated UI journey need manual verification. The standard plugin package requires a real Figma plugin identity/installation before broad distribution. Event wildcard DNS remains Phase 7.
