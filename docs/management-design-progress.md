# Management and design overhaul

> Historical planning checklist, superseded on 28 September 2026 by [the current change list](changes-20260928.md) and [Figma-first contract](figma-product-contract.md). The internal website-builder proposal below is no longer the product direction. No release is authorized without an explicit deploy instruction.

Baseline: main 31bc2ec. Preserve newer English UI and navigation work, scanner interface and organizer branding.

Release: validate locally, one production release after the complete change set. No preview builds.

## Work checklist
- [ ] Safe gate/zone/activity/benefit editing, deletion and lifecycle controls
- [ ] Preserve attendee and scan histories and validate cross-event references
- [ ] Search/filter/pagination and actionable mutation errors
- [ ] Shared design model and rendering across preview, public passes and print
- [ ] Draft/publish, optimistic revisions, versions and restore
- [ ] Organizer website sections, branding and responsive preview
- [ ] Physical pass editor, dynamic fields, layer controls and QR validation
- [ ] Figma plugin presets/mapping/validation and draft import
- [ ] Integration errors and non-destructive synchronization
- [ ] Browser, authorization, migration and build verification
- [ ] Complete change list and one release

## Audit findings
- Data creation silently ignores DB errors; gate deletion/editing missing.
- Deletion cascades may erase activity histories or detach scan stations.
- Figma synchronization currently changes the active design immediately.
- Figma PNG includes dynamic placeholders, risking doubled text in overlays.
- Printed wristbands ignore the Figma layout used by digital passes.
- Root pathname-keyed transition remounts persistent layouts.
- Global language MutationObserver can rewrite organizer-authored content.
- Existing Figma plugin source was not found in the main repository or owner's repository list.
