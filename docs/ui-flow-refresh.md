# PassFlow reference UI refresh

Based on main at `5cc48a1` and the two reference images supplied on 27 September 2026.

## Approved scope

Keep the existing colorful homepage and scanner. Apply the reference's white/gray surfaces, lavender/lime artwork, compact controls, desktop sidebar, and clean rows to authentication, account, organizer, event management, event discovery, profile, and the default public event template. Preserve organizer-selected event colors and custom Figma designs.

## Implementation

- Shared workspace sidebar keeps the existing destinations and account controls, with a compact mobile menu.
- Auth pages share a lightweight CSS/vector lanyard illustration. No new runtime dependency or generated bitmap.
- Organizer events use searchable rows with real check-in counts, progress, and publication status.
- Event headers and tabs stay inside the existing persistent route layout. Event styles, forms, and tables use the shared scoped design system.
- All added styling is scoped to the new workspace/auth classes. Existing homepage source, homepage artwork, scanner component, scanner route, scan API, and auth authorization remain unchanged.

## Verification

- ESLint, TypeScript, production build.
- 36 Chromium route/viewport checks at 320, 390, 820, and 1440 px: no horizontal page overflow or uncaught JavaScript errors.
- Search and draft filtering, mobile menu, and dark-mode review.
- Public routes rendered normally. Signed-in shared components were reviewed with a temporary local-only fixture removed before the final build; fixture figures are sample data.
- Live login, database writes, camera hardware, and Figma OAuth were not exercised.

## Customize follow-up and release

The user approved one combined push and production deployment on 27 September 2026.

- Separate event-page and pass/QR tabs retain unsaved settings while switching.
- Four palette presets, validated HEX fields, visual layout choices, desktop/mobile live preview, and explicit saved/unsaved/error states.
- Asset previews include logo and cover; canceling a later selection restores the last successful upload.
- Pass previews follow the configured physical dimensions; format changes supply matching defaults and out-of-bounds QR placement blocks saving.
- Theme and QR actions now confirm a returned database row before reporting success, preserving authorization, claim mode, and existing templates.
- Seven auth/customize action tests pass, including rejected writes and missing configuration. Database tests use a mocked Supabase boundary; no production records were mutated for testing.
- Customize browser checks at 320, 390, 820, and 1440 px pass, including invalid HEX, reset, tab state retention, preview device switching, dimension changes, and QR bounds.

Ship this together with the reference UI as one production release.

The protected main branch requires a pull request. Vercel previews are disabled only for `ui/flow-reference-release`; merging the verified PR triggers the single production deployment.

## Rounded UI follow-up

Based on `673a7f4`, unify the existing homepage and workspace without changing application actions or scanner behavior:

- Move unified important declarations into the existing `passflow-ui` layer so legacy important styles no longer defeat the rounded cards and floating event dock. Keep ordinary declarations unlayered.
- Align sidebar/tablet breakpoints at 1024 px, preserve space under mobile navigation, simplify workspace backgrounds and headers, and share the brand mark and event-card artwork.
- Promote the existing banner uploader and use wide 16:9 artwork in public layouts and previews, including Minimal. Keep organizer colors isolated from the dashboard dark theme.
- Validation: lint, TypeScript and production build pass. Twenty browser route/viewport checks at 320, 390, 820, 1000 and 1440 px pass, including actual scroll positions for the sticky dock, rounded hero styles, banner selection/layout/reset, and no page overflow or uncaught errors. Production CSS and dark palette checks pass. Temporary local review route removed and verified as 404.
- No dependency, database, authentication or scanner changes.
- User approved this release and asked to record that a positive response to a completed result authorizes push and deployment. Recorded in AGENTS.md. The release branch disables previews so merging the PR produces one production deployment.
