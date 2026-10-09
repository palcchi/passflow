"use client";
import { useState, useTransition } from "react";
import type { PassFlowEvent } from "@/lib/events";
import { saveEventTheme } from "@/app/organizer/events/actions";
import { AssetUploadCard } from "@/components/asset-upload-card";

// Branding used outside the Figma website: event cards, link previews, the pass page and passes without a Figma design.
export function EventBranding({ event }: { event: PassFlowEvent }) {
  const [primary, setPrimary] = useState(event.theme.primary);
  const [saved, setSaved] = useState(event.theme.primary);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function save() {
    const data = new FormData();
    data.set("eventId", event.id);
    for (const [key, value] of Object.entries({ ...event.theme, primary })) data.set(key, String(value ?? ""));
    startTransition(async () => {
      try { const result = await saveEventTheme(data); if (result.ok) setSaved(primary); setMessage(result.message); }
      catch { setMessage("The accent color could not be saved. Please try again."); }
    });
  }
  return <section className="ui-card ui-settings-card" aria-labelledby="branding-title">
    <div className="ui-settings-side">
      <h2 id="branding-title" className="ui-h3">Branding</h2>
      <p>Used outside your Figma website: event cards, link previews, the pass page and passes without a Figma design.</p>
    </div>
    <div className="ui-stack">
      <div className="ui-grid ui-grid-3 ui-uploads">
        <AssetUploadCard eventId={event.id} assetType="hero" label="Banner" hint="1600 × 900, max 5 MB" currentUrl={event.heroImageUrl} compact />
        <AssetUploadCard eventId={event.id} assetType="logo" label="Logo" hint="Square, max 5 MB" currentUrl={event.logoUrl} compact />
        <AssetUploadCard eventId={event.id} assetType="poster" label="Poster" hint="Portrait, max 5 MB" currentUrl={event.posterUrl} compact />
      </div>
      <div className="ui-accent">
        <label htmlFor="branding-accent" className="ui-label">Accent colour</label>
        <input id="branding-accent" type="color" value={primary} onChange={(e) => { setPrimary(e.target.value); setMessage(""); }} />
        <code className="ui-mono">{primary}</code>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={pending || primary === saved} onClick={save}>{pending ? "Saving…" : "Save colour"}</button>
      </div>
      {message && <p role="status" className="ui-notice">{message}</p>}
    </div>
  </section>;
}
