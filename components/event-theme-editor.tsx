"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, Check, Monitor, Smartphone, MapPin, RotateCcw } from "lucide-react";
import type { EventTheme, PassFlowEvent } from "@/lib/events";
import { saveEventTheme } from "@/app/admin/actions";
import { AssetUploadCard } from "@/components/asset-upload-card";
import { FlowMark, FlowShapes } from "@/components/flow-art";
import { eventInk } from "@/lib/event-colors";

const colorFields = [
  { key: "primary", label: "Aksen utama" },
  { key: "secondary", label: "Aksen pendamping" },
  { key: "background", label: "Latar halaman" },
  { key: "foreground", label: "Teks" },
  { key: "surface", label: "Permukaan kartu" },
] as const;
const presets = [
  { name: "Lavender", values: ["#7965d8", "#d3ff72", "#faf9ff", "#24212f", "#ffffff"] },
  { name: "Sage", values: ["#365947", "#dce7b2", "#f6f8f3", "#243128", "#ffffff"] },
  { name: "Coral", values: ["#b84038", "#ffd2b3", "#fff8f3", "#332425", "#ffffff"] },
  { name: "Midnight", values: ["#c3b7ff", "#d3ff72", "#16151c", "#f4f2fa", "#24222d"] },
];
const layouts = [{ value: "minimal", name: "Minimal", note: "Fokus pada detail" }, { value: "editorial", name: "Editorial", note: "Judul yang menonjol" }, { value: "split", name: "Split", note: "Teks dan visual" }] as const;
function hex(value: string) {
  const raw = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : /^[0-9a-f]{3}$/i.test(raw) ? `#${raw.split("").map(c => c + c).join("").toLowerCase()}` : null;
}
function initialTheme(theme: EventTheme): EventTheme {
  return { ...theme, ...Object.fromEntries(colorFields.map(({ key }) => [key, hex(theme[key]) || theme[key]])), headerStyle: theme.headerStyle ?? "editorial" };
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
  const dirty = colorFields.some(({ key }) => theme[key] !== saved[key]) || theme.headerStyle !== saved.headerStyle || !valid;
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
      } catch { setNotice({ ok: false, text: "Belum berhasil menyimpan. Periksa koneksi lalu coba lagi." }); }
    });
  }
  return <div className="customize-studio">
    <div className="customize-controls">
      <fieldset className="customize-card" disabled={pending}>
        <legend className="sr-only">Warna dan layout event</legend>
        <div className="customize-section-title"><span>01</span><div><h3>Warna & suasana</h3><p>Mulai dari palet, lalu sesuaikan detailnya.</p></div></div>
        <div className="customize-palettes" aria-label="Preset warna">{presets.map(preset => <button type="button" key={preset.name} aria-label={`Palet ${preset.name}`} aria-pressed={colorFields.every(({ key }, i) => theme[key] === preset.values[i])} onClick={() => {
          setDraft(d => ({ ...d, ...Object.fromEntries(colorFields.map(({ key }, i) => [key, preset.values[i]])) })); setNotice(null);
        }}><span>{preset.values.slice(0, 3).map((value, i) => <i key={i} style={{ background: value }}/>)}</span><small>{preset.name}</small></button>)}</div>
        <div className="customize-colors">{colorFields.map(({ key, label }) => <div className="customize-color-row" key={key}><label htmlFor={`theme-hex-${key}`}>{label}</label><div><input type="color" aria-label={`Pilih warna ${label}`} value={hex(draft[key]) || hex(saved[key]) || "#ffffff"} onChange={e => change(key, e.target.value)}/><input id={`theme-hex-${key}`} type="text" spellCheck={false} maxLength={7} aria-label={`HEX ${label}`} aria-invalid={!hex(draft[key])} value={draft[key]} onChange={e => change(key, e.target.value)} onBlur={() => { const value = hex(draft[key]); if (value) setDraft(d => ({ ...d, [key]: value })); }}/></div></div>)}</div>
        {!valid && <p className="customize-feedback is-error" role="alert">Gunakan kode HEX 3 atau 6 digit, misalnya #8273ef.</p>}
        <div className="customize-section-title customize-divider"><span>02</span><div><h3>Layout halaman</h3><p>Pilih cara event kamu diperkenalkan.</p></div></div>
        <div className="customize-layouts">{layouts.map(layout => <button type="button" key={layout.value} aria-pressed={draft.headerStyle === layout.value} onClick={() => change("headerStyle", layout.value)}><span className={`customize-layout-thumb is-${layout.value}`} aria-hidden="true"><i/><i/><i/></span><strong>{layout.name}</strong><small>{layout.note}</small>{draft.headerStyle === layout.value && <Check size={13}/>}</button>)}</div>
        <div className="customize-save"><span role="status">{pending ? "Menyimpan…" : dirty ? "Ada perubahan belum disimpan" : "Semua perubahan tersimpan"}</span><div><button className="button button-ghost" type="button" disabled={!dirty || pending} onClick={() => {setDraft(saved); setNotice(null);}}><RotateCcw size={14}/>Reset</button><button className="button button-dark" type="button" disabled={!dirty || !valid || pending} onClick={save}>{pending ? "Menyimpan…" : "Simpan tampilan"}<Check size={14}/></button></div></div>
        {notice && <p role={notice.ok ? "status" : "alert"} className={`customize-feedback ${notice.ok ? "is-success" : "is-error"}`}>{notice.text}</p>}
      </fieldset>
      <section className="customize-card customize-assets"><div className="customize-section-title"><span>03</span><div><h3>Banner & identitas</h3><p>Banner yang kamu upload tampil di homepage, daftar event, dan halaman publik.</p></div></div><div className="customize-asset-grid">
        <AssetUploadCard eventId={event.id} assetType="hero" label="Banner event" hint="Rekomendasi 1600 × 900 · tampil di homepage & halaman publik · max 5 MB" currentUrl={event.heroImageUrl} compact onPreview={setHero}/>
        <AssetUploadCard eventId={event.id} assetType="logo" label="Logo event" currentUrl={event.logoUrl} compact onPreview={setLogo}/>
        <AssetUploadCard eventId={event.id} assetType="poster" label="Poster event" currentUrl={event.posterUrl} compact onPreview={setPoster}/>
      </div></section>
    </div>
    <aside className="customize-preview-wrap" aria-label="Preview halaman event"><div className="customize-preview-toolbar"><span><i/>Live preview</span><div role="group" aria-label="Ukuran preview"><button type="button" aria-label="Preview desktop" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={16}/></button><button type="button" aria-label="Preview HP" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={16}/></button></div><a href={`/e/${event.slug}?view=details`} target="_blank" rel="noreferrer" aria-label="Buka halaman event tersimpan"><ArrowUpRight size={17}/></a></div>
      <div className="customize-preview-stage"><div className={`customize-preview-page is-${device} layout-${theme.headerStyle}`} style={{ "--foreground": theme.foreground, "--muted-foreground": `color-mix(in srgb, ${theme.foreground} 72%, ${theme.background})`, "--custom-primary": theme.primary, "--custom-secondary": theme.secondary, background: theme.background, color: theme.foreground, "--custom-surface": theme.surface } as CSSProperties}>
        <div className="customize-preview-nav"><span><FlowMark/>PassFlow</span><span>Event details ↗</span></div>
        <div className="customize-preview-hero"><div className="customize-preview-copy">{logo && <Image className="customize-preview-logo" src={logo} width={90} height={44} alt="Logo event" unoptimized/>}<span className="customize-preview-eyebrow" style={{ color: theme.foreground, background: theme.secondary }}>{event.eyebrow || "UPCOMING EVENT"}</span><h2>{event.name}</h2><p>{event.description || "Cerita event kamu dimulai di sini."}</p><div className="customize-preview-meta"><span><CalendarDays size={13}/>{event.dateLabel}</span><span><MapPin size={13}/>{event.venue || "Lokasi segera diumumkan"}</span></div><span className="customize-preview-cta" style={{ background: theme.primary, color: eventInk(theme.primary) }}>Daftar / buka pass<ArrowUpRight size={14}/></span></div><div className={`customize-preview-art${cover ? " has-banner" : ""}`}>{cover ? <Image src={cover} alt="Banner event" fill unoptimized sizes="(max-width: 900px) 80vw, 420px"/> : <FlowShapes color={theme.primary}/>}</div></div>
        <div className="customize-preview-bottom"><span>01 <b>Daftar ke event</b></span><span>02 <b>Simpan pass</b></span><span>03 <b>See you there.</b></span></div>
      </div></div><p className="customize-preview-note">Preview mengikuti perubahanmu. Banner event juga dipakai pada kartu event publik.</p>
    </aside>
  </div>;
}
