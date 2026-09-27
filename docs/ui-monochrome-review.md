# Monochrome studio UI

Branch: `ui/monochrome-studio`. Based on production commit `ffd07e2`.

## Changes

- Neutral white/gray surfaces, Apple system font stack, bold/light editorial headings, and lightweight folder/ticket/sticker artwork. No new runtime dependencies.
- Shared login, registration, password recovery, and crew invitation layout. Registration keeps the intended destination when switching between login and signup.
- Homepage shows the three newest real published events, with explicit empty/unavailable states. Organizer dashboard offers the latest managed project and searchable status filters. Attendee event cards continue to open an existing digital pass.
- Shared navigation, event cards, management tabs, profile, theme/QR editors, default public event pages, errors, and scanner setup adopt the same visual system. Designer-authored Figma frames, physical export dimensions, and organizer-selected event colors are preserved.
- New `passflow-ui` cascade layer resolves conflicts with legacy important declarations without deleting the old component rules.
- Upload previews now retain their image backgrounds; invalid uploads reset selection and disable submission. File inputs are keyboard reachable. Profile photo uploads validate format and size locally as well as on the server.
- Public-event back links use `view=details` to avoid redirecting registered attendees back to their pass. Ticket choice uses the shared custom dropdown and phone input uses a telephone keyboard.
- Crew invitation redirects accept only the existing 32-character base64url token shape. Arbitrary redirect queries remain rejected. Password recovery handles missing configuration and failed requests without crashing.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`.
- `node --experimental-strip-types --test scripts/auth-unit.test.mjs`: all 3 tests pass, including redirect safety and crew destination preservation.
- Chromium UI checks at 320, 390, 820, and 1440 pixels. Public pages tested directly; signed-in components tested in a temporary local fixture harness that was removed before the final build.
- No uncaught browser errors in the final UI run. Theme preview and QR mode cards fit the page at all four widths. Management tabs and data tables intentionally scroll inside their own containers on narrow screens.
- Interactions checked: search, draft filter, exclusive dropdowns, calendar closing, `25.000` number formatting, profile/mobile menu exclusivity, upload preview/invalid file rejection, password visibility, and persisted theme preference.
- Final homepage and login screenshots were captured from the local production build. Organizer screenshots contain example event data for visual review.

## Boundaries

No remote database changes, pushes, or deployments were performed. Live authentication, Figma OAuth, persistent storage uploads, and physical camera scanning were not re-tested against production credentials. Existing server actions, authorization, and scanner behavior remain in place. Review the new UI before requesting a single batched deployment.
