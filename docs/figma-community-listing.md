# PassFlow plugin: Figma Community listing

Use this when publishing `figma-plugin-standard/` from Figma Desktop. The manifest ID in `figma-plugin-standard/manifest.json` must be the ID of the plugin you publish. Rebuild after any change with `node scripts/build-figma-standard.mjs`.

## Publish steps

1. In Figma Desktop, go to Plugins → Development → right-click **PassFlow** → **Publish**.
2. Fill in the fields below. Upload the icon and cover from the "PassFlow template test (Claude)" file in your drafts: frames **Community icon 128** and **Community cover 1920**. Export both as PNG at 1×.
3. Under Data security, answer from the "Network access and data" section below.
4. Submit for review. Later versions are published with **Publish new version** from the same menu.

## Fields

**Name:** PassFlow

**Tagline:** Design your event site and passes in Figma. Run the event in PassFlow.

**Description:**

PassFlow turns the event website and passes you design in Figma into a live event: registration, tickets, QR credentials and check-in.

- Start from a Blank, Minimal or Festival template with Desktop, Tablet and Mobile frames, a sticky navbar and ready sections.
- Everything you see is yours: type your own text, use any Google font, photos, gradients and shadows.
- Links and motion use Figma itself. On click → Open link or Scroll to, Navigate to another page frame, and While hovering → Change to a variant become real links and hover effects. Sections can ease in on scroll.
- Add a ticket page and extra pages such as Agenda or FAQ.
- Design ID cards, digital passes and wristbands. Mark the attendee name, photo, category, code and QR. PassFlow fills them in per person and prints at about 300 dpi. Wristbands are printed unclaimed and claimed later by scanning the QR.
- Edits sync to a private draft. Nothing goes live until you preview and publish in PassFlow.

Pair a file with a 10-minute code from PassFlow → Event → Design.

**Tags:** event, website, ticket, badge, wristband

**Support / website:** https://passflow.my.id

## Network access and data

- **Allowed domain:** `https://passflow.my.id`. This is used to pair an event and to sync drafts. `http://localhost:3000` is listed only for development.
- **What is sent:** the layers of frames marked as PassFlow website, page or pass frames, including text, geometry, colours, exported artwork and images. The file name is sent once, at pairing.
- **What is stored on the device:** an event-scoped sync token in Figma `clientStorage`. It expires after 30 days and can be revoked in PassFlow at any time.
- **What is stored in the file:** non-secret metadata (event ID and name, layer bindings) in shared plugin data. No passwords, OAuth tokens or keys are stored in the file or in the plugin source.
- **Publishing:** the plugin never publishes. Organizers publish in PassFlow.
