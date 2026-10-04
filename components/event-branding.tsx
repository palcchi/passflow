"use client";
import { useState, useTransition } from "react";
import type { PassFlowEvent } from "@/lib/events";
import { saveEventTheme } from "@/app/admin/actions";
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
  return <section className="event-admin-section">
    <span className="section-kicker">Branding</span>
    <h3>Banner, logo and accent</h3>
    <p>Shown outside your Figma website: event cards, link previews, the attendee pass page and passes that have no Figma design yet.</p>
    <div className="branding-grid">
      <AssetUploadCard eventId={event.id} assetType="hero" label="Event banner" hint="1600 × 900 · max 5 MB" currentUrl={event.heroImageUrl} compact />
      <AssetUploadCard eventId={event.id} assetType="logo" label="Event logo" currentUrl={event.logoUrl} compact />
      <AssetUploadCard eventId={event.id} assetType="poster" label="Event poster" currentUrl={event.posterUrl} compact />
    </div>
    <div className="branding-accent">
      <label htmlFor="branding-accent">Accent color</label>
      <input id="branding-accent" type="color" value={primary} onChange={(e) => { setPrimary(e.target.value); setMessage(""); }} />
      <code>{primary}</code>
      <button type="button" className="button button-dark" disabled={pending || primary === saved} onClick={save}>{pending ? "Saving…" : "Save accent"}</button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
