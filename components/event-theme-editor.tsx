"use client";

import { ChangeEvent, useMemo, useState, useTransition } from "react";
import { ImagePlus, RotateCcw, Save } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { saveEventTheme, uploadEventAsset } from "@/app/admin/actions";

export function EventThemeEditor({ event }: { event: PassFlowEvent }) {
  const [primary, setPrimary] = useState(event.theme.primary);
  const [secondary, setSecondary] = useState(event.theme.secondary);
  const [background, setBackground] = useState(event.theme.background);
  const [foreground, setForeground] = useState(event.theme.foreground);
  const [surface, setSurface] = useState(event.theme.surface);
  const [headerStyle, setHeaderStyle] = useState(event.theme.headerStyle ?? "editorial");
  const [heroPreview, setHeroPreview] = useState<string | null>(event.heroImageUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewStyle = useMemo(
    () => ({
      background,
      color: foreground,
      borderColor: primary,
    }),
    [background, foreground, primary]
  );

  function handleHero(eventInput: ChangeEvent<HTMLInputElement>) {
    const file = eventInput.target.files?.[0];
    if (!file) return;
    setHeroPreview(URL.createObjectURL(file));
  }

  function saveTheme() {
    const formData = new FormData();
    formData.set("eventId", event.id);
    formData.set("primary", primary);
    formData.set("secondary", secondary);
    formData.set("background", background);
    formData.set("foreground", foreground);
    formData.set("surface", surface);
    formData.set("headerStyle", headerStyle);
    setMessage(null);
    startTransition(async () => {
      await saveEventTheme(formData);
      setMessage("Theme saved.");
    });
  }

  return (
    <div className="theme-editor-grid">
      <section className="theme-controls">
        <div className="control-block">
          <span className="field-label">Brand colors</span>
          {[
            ["Primary", primary, setPrimary],
            ["Secondary", secondary, setSecondary],
            ["Background", background, setBackground],
            ["Text", foreground, setForeground],
            ["Surface", surface, setSurface],
          ].map(([label, value, setter]) => {
            const update = setter as (value: string) => void;
            return (
              <label className="color-field" key={String(label)}>
                <span>{String(label)}</span>
                <div>
                  <input type="color" value={String(value)} onChange={(e) => update(e.target.value)} />
                  <code>{String(value)}</code>
                </div>
              </label>
            );
          })}
        </div>

        <div className="control-block">
          <span className="field-label">Public header</span>
          <label className="text-sm">Layout
            <select value={headerStyle} onChange={(e) => setHeaderStyle(e.target.value as "minimal" | "editorial" | "split")} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3">
              <option value="minimal">Minimal · fokus ke judul</option>
              <option value="editorial">Editorial · image dan informasi</option>
              <option value="split">Split · copy dan visual seimbang</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Pilihan ini mengatur struktur header halaman event publik.</p>
        </div>

        <div className="control-block">
          <span className="field-label">Event assets</span>
          {[
            ["logo", "Logo"],
            ["hero", "Hero image"],
            ["poster", "Poster"],
          ].map(([type, label]) => (
            <form action={uploadEventAsset} className="mb-3" key={type}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="assetType" value={type} />
              <label className="upload-zone">
                <ImagePlus size={22} />
                <strong>{label}</strong>
                <span>JPG, PNG, WEBP, max 5 MB</span>
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={type === "hero" ? handleHero : undefined}
                />
              </label>
              <button className="button button-ghost mt-2 w-full" type="submit">Upload {label.toLowerCase()}</button>
            </form>
          ))}
        </div>

        <div className="theme-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              setPrimary(event.theme.primary);
              setSecondary(event.theme.secondary);
              setBackground(event.theme.background);
              setForeground(event.theme.foreground);
              setSurface(event.theme.surface);
              setHeaderStyle(event.theme.headerStyle ?? "editorial");
              setHeroPreview(event.heroImageUrl);
            }}
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button className="button button-dark" type="button" disabled={pending} onClick={saveTheme}>
            <Save size={16} /> {pending ? "Saving..." : "Save theme"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-success">{message}</p>}
      </section>

      <section className="theme-preview-wrap">
        <span className="field-label">Live preview</span>
        <div className="theme-preview" style={previewStyle}>
          {heroPreview && (
            <div className="theme-preview-image" style={{ backgroundImage: `url(${heroPreview})` }} />
          )}
          <div className="theme-preview-content" style={{ background: surface }}>
            <span style={{ color: primary }}>{event.eyebrow}</span>
            <h2>{event.name}</h2>
            <p>{event.description}</p>
            <button style={{ background: primary, color: secondary }} type="button">Open event pass</button>
          </div>
        </div>
      </section>
    </div>
  );
}
