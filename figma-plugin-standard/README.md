# PassFlow standard Figma plugin

PassFlow uses a standard Figma Design plugin for the connected event workflow.

## What this plugin does

- pairs the current Figma file to a PassFlow event with a temporary code;
- stores semantic bindings in Figma metadata, so renaming layers does not break the connection;
- creates editable Desktop 1440 and Mobile 390 starter frames;
- offers Minimal, Editorial and Festival starter styles;
- inserts Hero, About, Tickets, Schedule, Speaker Grid, Sponsor Grid, Venue, Venue Map, FAQ, CTA and Footer blocks;
- supports Simple Mode and Advanced Mode;
- publishes to the live event site and passes when you press Sync (edits alone never publish);
- shows blocking problems and warnings in the plugin, selecting the Figma layer each one points at;
- opens the event Design workspace in PassFlow.

## Security model

The plugin never contains a Supabase service-role key, Figma OAuth secret or database password.

Pairing flow:

    PassFlow organizer session
    → temporary pairing code
    → plugin exchanges code
    → event-scoped opaque plugin token
    → token stored in Figma clientStorage
    → sync API (validates, then publishes)

The Figma document only remembers non-secret event metadata and bindings. Revoking the paired file in PassFlow invalidates the server-side connection.

## Development installation

Figma assigns a standard plugin ID when a development plugin is created. Keep the generated ID in the local manifest used for installation.

1. Open Figma Desktop.
2. Go to **Plugins → Development → New plugin / Import plugin from manifest**.
3. Choose **New plugin → Figma design → Empty**, then copy the numeric ID from the generated `manifest.json` and discard that scaffold.
4. From the repository root run `node scripts/build-figma-standard.mjs <ID>`. It writes the ID into `manifest.json` and rebuilds `code.js` and the ZIP.
5. Import `figma-plugin-standard/manifest.json`.
6. Open any Design file and run **PassFlow** from Development plugins.

Production API access is restricted to `https://passflow.my.id`. Local development may use `http://localhost:3000`.

## Pairing workflow

In PassFlow:

    Event
    → Design
    → Generate pairing code

In Figma:

    PassFlow plugin
    → enter PF-XXXXXXXXXX
    → Pair event
    → Insert Desktop + Mobile starter
    → edit freely
    → Sync
    → Preview
    → Live on the event site

Pairing codes expire after ten minutes. Copied files should be paired again before they can sync to another event.

## Binding model

Bindings are metadata-based, not layer-name based.

Examples:

    eventName
    eventDescription
    eventDate
    venue
    venueMap
    tickets
    schedule
    speakers
    sponsors
    register
    myPass
    customLink

A designer can rename a layer after binding it without breaking PassFlow.

## Website contract

Required:

- Event Name
- one Register action or Tickets block

Recommended:

- Event Date
- Venue

Optional:

- About
- Schedule
- Speakers
- Sponsors
- Venue Map
- FAQ

Sync is refused, and the layer selected, when a required binding is missing or a QR would not scan. Everything else goes live and is listed as a warning.

## Current boundaries

- Auto-sync runs while the plugin is open.
- Responsive frames should remain top-level frames on the current Figma page.
- Complex masks, effects, rotations and container image fills still require Preview review.
- Leaf vector/shape/image artwork can be rasterized instead of turning the entire website into one screenshot.
- Auto layout is captured at the current responsive frame size; Desktop and Mobile remain the source of responsive truth.
- Publishing happens only on Sync.
