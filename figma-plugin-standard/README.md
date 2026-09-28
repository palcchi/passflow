# PassFlow standard plugin

This is a standard Figma Design plugin, not the account-library plugin. Source is prepared locally; it is not published or live.

## Development installation

1. Create a development plugin in Figma to obtain its assigned ID.
2. Replace `REPLACE_WITH_FIGMA_ASSIGNED_PLUGIN_ID` in manifest.json with that ID.
3. Source checkout: build with `node scripts/build-figma-standard.mjs` from the repository root. The download already includes compiled code.js; no build is needed for the ZIP.
4. Import the manifest in Figma desktop. Public distribution and Community publishing are separate release steps.

The production API origin is fixed to https://passflow.my.id. Never embed service-role keys or OAuth secrets in plugin source. Pairing returns an event-scoped opaque credential stored only in Figma clientStorage, not shared document metadata. Revoke or renew it in PassFlow. Codes expire after ten minutes; plugin grants after thirty days.

## Workflow

Open an existing file, pair the event, insert the Desktop/Mobile starter, edit, auto-sync draft, preview in PassFlow, publish in PassFlow. Advanced Mode can start with a blank frame and assign responsive roles and dynamic bindings. Renames do not change bindings.

## Current boundaries

- Observes node changes on the current page only. Keep paired responsive frames on that page.
- Figma fileKey is restricted for many plugin distributions. Shared document identity is not proof of file ownership and is copied when a file is duplicated. A copied file must be paired again for another event. Client credentials never travel with copied/shared metadata.
- Reopening the plugin or changing pages requires confirming the linked event before auto-sync resumes. This prevents silent updates from a copied file on the same device. Pair again to target a different event.
- Basic text, solid fills, rectangular layout and dynamic actions render as HTML. Individual vector/image artwork is rasterized, never the entire website. Effects, rotations, mixed text styles and complex masks are not fully supported; review the preview.
- The Web app's migration and server configuration must be released before pairing works. Downloading this source does not activate the API.
- The optional webhook receiver marks external changes only. Provisioning, verified file-key mapping and server passcodes are separate release steps; webhook delivery never publishes.
