"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, Check, Monitor, Smartphone, MapPin, RotateCcw } from "lucide-react";
import type { EventTheme, PassFlowEvent } from "@/lib/events";
import { saveEventTheme } from "@/app/admin/actions";
import { AssetUploadCard } from "@/components/asset-upload-card";
import { FlowMark } from "@/components/flow-art";
import { EventArtwork } from "@/components/event-artwork";
import { eventInk } from "@/lib/event-colors";

const colorFields = [
  { key: "primary", label: "Primary accent" },
  { key: "secondary", label: "Secondary accent" },
  { key: "background", label: "Page background" },
  { key: "foreground", label: "Text" },
  { key: "surface", label: "Card surface" },
] as const;
const presets = [
  { name: "Lavender", values: ["#7965d8", "#d3ff72", "#faf9ff", "#24212f", "#ffffff"] },
  { name: "Sage", values: ["#365947", "#dce7b2", "#f6f8f3", "#243128", "#ffffff"] },
  { name: "Coral", values: ["#b84038", "#ffd2b3", "#fff8f3", "#332425", "#ffffff"] },
  { name: "Midnight", values: ["#c3b7ff", "#d3ff72", "#16151c", "#f4f2fa", "#24222d"] },
];
const fonts = [{ value: "sans", name: "Sans", note: "Clean, modern", family: "inherit" }, { value: "serif", name: "Serif", note: "Classic, editorial", family: '"New York", "Iowan Old Style", Georgia, serif' }, { value: "mono", name: "Mono", note: "Technical, bold", family: 'ui-monospace, "SF Mono", Menlo, monospace' }] as const;
const corners = [{ value: "rounded", name: "Rounded", radius: "999px" }, { value: "soft", name: "Soft", radius: "14px" }, { value: "sharp", name: "Sharp", radius: "4px" }] as const;
const layouts = [{ value: "minimal", name: "Minimal", note: "Clean and detail-focused" }, { value: "editorial", name: "Editorial", note: "Strong editorial hierarchy" }, { value: "split", name: "Split", note: "Balanced copy and visual" }] as const;
function hex(value: string) {
  const raw = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : /^[0-9a-f]{3}$/i.test(raw) ? `#${raw.split("").map(c => c + c).join("").toLowerCase()}` : null;
}
function initialTheme(theme: EventTheme): EventTheme {
  return { ...theme, ...Object.fromEntries(colorFields.map(({ key }) => [key, hex(theme[key]) || theme[key]])), headerStyle: theme.headerStyle ?? "editorial", tagline: theme.tagline ?? "", ctaLabel: theme.ctaLabel ?? "", font: theme.font ?? "sans", corners: theme.corners ?? "rounded" };
}

export function EventThemeEditor({ event }: { event: PassFlowEvent }) {
  const [saved, setSaved] = useState(() => initialTheme(event.theme));
  const [draft, setDraft] = useState(saved);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [hero, setHero] = useState(event.heroImageUrl);
  const [logo, setLogo] = useState(event.logoUrl);
  const [poster, setPoster] = useState(event.posterUrl);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const valid = colorFields.every(({ key }) => hex(draft[key]));
  const theme = { ...draft, ...Object.fromEntries(colorFields.map(({ key }) => [key, hex(draft[key]) || saved[key]])) };
  const dirty = colorFields.some(({ key }) => theme[key] !== saved[key]) || (["headerStyle", "tagline", "ctaLabel", "font", "corners"] as const).some(key => theme[key] !== saved[key]) || !valid;
  const fontFamily = fonts.find(f => f.value === theme.font)?.family ?? "inherit";
  const radius = corners.find(c => c.value === theme.corners)?.radius ?? "999px";
  const cover = hero || poster;
  function change(key: keyof EventTheme, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
    setNotice(null);
  }
  function save() {
    if (!valid || !dirty || pending) return;
    const snapshot = { ...theme };
    const data = new FormData();
    data.set("eventId", event.id);
    Object.entries(snapshot).forEach(([key, value]) => data.set(key, value));
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await saveEventTheme(data);
        if (result.ok) setSaved(snapshot);
        setNotice({ ok: result.ok, text: result.message });
      } catch { setNotice({ ok: false, text: "Changes could not be saved. Check your connection and try again." }); }
    });
  }
  return <div className="customize-studio">
    <div className="customize-controls">
      <fieldset className="customize-card" disabled={pending}>
        <legend className="sr-only">Event colors and layout</legend>
        <div className="customize-section-title"><span>01</span><div><h3>Color & atmosphere</h3><p>Start with a palette, then refine each detail.</p></div></div>
        <div className="customize-palettes" aria-label="Color presets">{presets.map(preset => <button type="button" key={preset.name} aria-label={`${preset.name} palette`} aria-pressed={colorFields.every(({ key }, i) => theme[key] === preset.values[i])} onClick={() => {
          setDraft(d => ({ ...d, ...Object.fromEntries(colorFields.map(({ key }, i) => [key, preset.values[i]])) })); setNotice(null);
        }}><span>{preset.values.slice(0, 3).map((value, i) => <i key={i} style={{ background: value }}/>)}</span><small>{preset.name}</small></button>)}</div>
        <div className="customize-colors">{colorFields.map(({ key, label }) => <div className="customize-color-row" key={key}><label htmlFor={`theme-hex-${key}`}>{label}</label><div><input type="color" aria-label={`Choose ${label.toLowerCase()}`} value={hex(draft[key]) || hex(saved[key]) || "#ffffff"} onChange={e => change(key, e.target.value)}/><input id={`theme-hex-${key}`} type="text" spellCheck={false} maxLength={7} aria-label={`HEX ${label}`} aria-invalid={!hex(draft[key])} value={draft[key]} onChange={e => change(key, e.target.value)} onBlur={() => { const value = hex(draft[key]); if (value) setDraft(d => ({ ...d, [key]: value })); }}/></div></div>)}</div>
        {!valid && <p className="customize-feedback is-error" role="alert">Use a valid 3- or 6-digit HEX value, for example #8273ef.</p>}
        <div className="customize-section-title customize-divider"><span>02</span><div><h3>Page layout</h3><p>Choose how the event is presented to attendees.</p></div></div>
        <div className="customize-layouts">{layouts.map(layout => <button type="button" key={layout.value} aria-pressed={draft.headerStyle === layout.value} onClick={() => change("headerStyle", layout.value)}><span className={`customize-layout-thumb is-${layout.value}`} aria-hidden="true"><i/><i/><i/></span><strong>{layout.name}</strong><small>{layout.note}</small>{draft.headerStyle === layout.value && <Check size={13}/>}</button>)}</div>
        <div className="customize-section-title customize-divider"><span>03</span><div><h3>Text & style</h3><p>Short words and a type style that sound like your event.</p></div></div>
        <div className="customize-text-fields">
          <label className="customize-field"><span>Tagline <small>{(draft.tagline ?? "").length}/60</small></span><input maxLength={60} value={draft.tagline ?? ""} onChange={e => change("tagline", e.target.value)} placeholder="e.g. A night of nail art and good company"/></label>
          <label className="customize-field"><span>Registration button <small>{(draft.ctaLabel ?? "").length}/28</small></span><input maxLength={28} value={draft.ctaLabel ?? ""} onChange={e => change("ctaLabel", e.target.value)} placeholder="Register now"/></label>
        </div>
        <div className="customize-option-group" role="group" aria-label="Font style">{fonts.map(f => <button type="button" key={f.value} aria-pressed={theme.font === f.value} onClick={() => change("font", f.value)}><strong style={{ fontFamily: f.family }}>Aa</strong><span>{f.name}<small>{f.note}</small></span></button>)}</div>
        <div className="customize-option-group is-compact" role="group" aria-label="Corner style">{corners.map(c => <button type="button" key={c.value} aria-pressed={theme.corners === c.value} onClick={() => change("corners", c.value)}><i style={{ borderRadius: c.value === "rounded" ? "999px" : c.radius }}/><span>{c.name}</span></button>)}</div>
        <div className="customize-save"><span role="status">{pending ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span><div><button className="button button-ghost" type="button" disabled={!dirty || pending} onClick={() => {setDraft(saved); setNotice(null);}}><RotateCcw size={14}/>Reset</button><button className="button button-dark" type="button" disabled={!dirty || !valid || pending} onClick={save}>{pending ? "Saving…" : "Save Quick Setup"}<Check size={14}/></button></div></div>
        {notice && <p role={notice.ok ? "status" : "alert"} className={`customize-feedback ${notice.ok ? "is-success" : "is-error"}`}>{notice.text}</p>}
      </fieldset>
      <section className="customize-card customize-assets"><div className="customize-section-title"><span>04</span><div><h3>Banner & identity</h3><p>The banner appears across discovery, event listings, and the public event page.</p></div></div><div className="customize-asset-grid">
        <AssetUploadCard eventId={event.id} assetType="hero" label="Event banner" hint="Recommended: 1600 × 900 · used across discovery and the public event page · max 5 MB" currentUrl={event.heroImageUrl} compact onPreview={setHero}/>
        <AssetUploadCard eventId={event.id} assetType="logo" label="Event logo" currentUrl={event.logoUrl} compact onPreview={setLogo}/>
        <AssetUploadCard eventId={event.id} assetType="poster" label="Event poster" currentUrl={event.posterUrl} compact onPreview={setPoster}/>
      </div></section>
    </div>
    <aside className="customize-preview-wrap" aria-label="Event page preview"><div className="customize-preview-toolbar"><span><i/>Draft preview</span><div role="group" aria-label="Preview size"><button type="button" aria-label="Desktop preview" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={16}/></button><button type="button" aria-label="Mobile preview" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={16}/></button></div><a href={`/e/${event.liveSlug ?? event.slug}?view=details`} target="_blank" rel="noreferrer" aria-label="Open published event page"><ArrowUpRight size={17}/></a></div>
      <div className="customize-preview-stage"><div className={`customize-preview-page is-${device} layout-${theme.headerStyle}`} style={{ "--foreground": theme.foreground, "--muted-foreground": `color-mix(in srgb, ${theme.foreground} 72%, ${theme.background})`, "--custom-primary": theme.primary, "--custom-secondary": theme.secondary, background: theme.background, color: theme.foreground, "--custom-surface": theme.surface, fontFamily, "--custom-radius": radius } as CSSProperties}>
        <div className="customize-preview-nav"><span><FlowMark/>PassFlow</span><span>Event details ↗</span></div>
        <div className="customize-preview-hero"><div className="customize-preview-copy">{logo && <Image className="customize-preview-logo" src={logo} width={90} height={44} alt="Event logo" unoptimized/>}{theme.tagline && <span className="customize-preview-eyebrow" style={{ color: theme.foreground, background: theme.secondary }}>{theme.tagline}</span>}<h2>{event.name}</h2><p>{event.description || "Your event story starts here."}</p><div className="customize-preview-meta"><span><CalendarDays size={13}/>{event.dateLabel}</span><span><MapPin size={13}/>{event.venue || "Venue to be announced"}</span></div><span className="customize-preview-cta" style={{ background: theme.primary, color: eventInk(theme.primary), borderRadius: radius }}>{theme.ctaLabel || "Register now"}<ArrowUpRight size={14}/></span></div><div className={`customize-preview-art${cover ? " has-banner" : ""}`}>{cover ? <Image src={cover} alt="Event banner" fill unoptimized sizes="(max-width: 900px) 80vw, 420px"/> : <EventArtwork event={{ id: event.id, theme }}/>}</div></div>
        <div className="customize-preview-bottom"><span>01 <b>Register</b></span><span>02 <b>Save pass</b></span><span>03 <b>See you there.</b></span></div>
      </div></div><p className="customize-preview-note">The preview updates as you edit. The event banner is also used on public event cards.</p>
    </aside>
  </div>;
}
