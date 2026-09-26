"use client";

import { useMemo, useState, useTransition } from "react";
import type { PassFlowEvent } from "@/lib/events";
import { saveEventTheme } from "@/app/admin/actions";
import { SmartSelect } from "@/components/form-fields";
import { AssetUploadCard } from "@/components/asset-upload-card";

export function EventThemeEditor({ event }: { event: PassFlowEvent }) {
  const [primary, setPrimary] = useState(event.theme.primary);
  const [secondary, setSecondary] = useState(event.theme.secondary);
  const [background, setBackground] = useState(event.theme.background);
  const [foreground, setForeground] = useState(event.theme.foreground);
  const [surface, setSurface] = useState(event.theme.surface);
  const [headerStyle, setHeaderStyle] = useState(
    event.theme.headerStyle ?? "editorial",
  );
  const [heroPreview, setHeroPreview] = useState<string | null>(
    event.heroImageUrl,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewStyle = useMemo(
    () => ({
      background,
      color: foreground,
      borderColor: primary,
      "--preview-primary": primary,
      "--preview-secondary": secondary,
      "--preview-surface": surface,
    }) as React.CSSProperties,
    [background, foreground, primary, secondary, surface],
  );

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
      setMessage("Theme berhasil disimpan.");
    });
  }

  function resetTheme() {
    setPrimary(event.theme.primary);
    setSecondary(event.theme.secondary);
    setBackground(event.theme.background);
    setForeground(event.theme.foreground);
    setSurface(event.theme.surface);
    setHeaderStyle(event.theme.headerStyle ?? "editorial");
    setHeroPreview(event.heroImageUrl);
    setMessage(null);
  }

  const colors = [
    { label: "Primary", value: primary, set: setPrimary },
    { label: "Secondary", value: secondary, set: setSecondary },
    { label: "Background", value: background, set: setBackground },
    { label: "Text", value: foreground, set: setForeground },
    { label: "Surface", value: surface, set: setSurface },
  ];

  return (
    <div className="theme-editor-grid">
      <section className="theme-controls studio-panel">
        <div className="editor-panel-heading">
          <div>
            <span className="section-kicker">Brand system</span>
            <h2>Visual identity</h2>
          </div>
          <span className="studio-soft-label">Live preview</span>
        </div>

        <div className="control-block">
          <span className="field-label">Brand colors</span>
          <div className="color-control-grid">
            {colors.map((item) => (
              <label className="color-field" key={item.label}>
                <span>
                  <strong>{item.label}</strong>
                  <code>{item.value}</code>
                </span>
                <span
                  className="color-picker-shell"
                  style={{ background: item.value }}
                >
                  <input
                    aria-label={`Pilih warna ${item.label}`}
                    type="color"
                    value={item.value}
                    onChange={(change) => item.set(change.target.value)}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-block">
          <span className="field-label">Public header</span>
          <SmartSelect
            name="headerStylePreview"
            value={headerStyle}
            onValueChange={(value) =>
              setHeaderStyle(value as "minimal" | "editorial" | "split")
            }
            options={[
              { value: "minimal", label: "Minimal", description: "Judul dan CTA" },
              { value: "editorial", label: "Editorial", description: "Visual besar" },
              { value: "split", label: "Split", description: "Copy dan visual seimbang" },
            ]}
          />
        </div>

        <div className="control-block">
          <span className="field-label">Event assets</span>
          <div className="asset-upload-stack">
            <AssetUploadCard
              eventId={event.id}
              assetType="logo"
              label="Logo event"
              currentUrl={event.logoUrl}
              compact
            />
            <AssetUploadCard
              eventId={event.id}
              assetType="hero"
              label="Hero image"
              currentUrl={event.heroImageUrl}
              compact
              onPreview={setHeroPreview}
            />
            <AssetUploadCard
              eventId={event.id}
              assetType="poster"
              label="Poster event"
              currentUrl={event.posterUrl}
              compact
            />
          </div>
        </div>

        <div className="theme-actions">
          <button className="button button-ghost" type="button" onClick={resetTheme}>
            Reset
          </button>
          <button
            className="button button-dark"
            type="button"
            disabled={pending}
            onClick={saveTheme}
          >
            {pending ? "Saving..." : message ? "Saved" : "Save theme"}
          </button>
        </div>
        {message && <p className="editor-inline-success">{message}</p>}
      </section>

      <section className="theme-preview-wrap">
        <div className="preview-toolbar">
          <span className="field-label">Public preview</span>
          <span>{headerStyle}</span>
        </div>

        <div
          className={`theme-preview theme-preview-${headerStyle}`}
          style={previewStyle}
        >
          {heroPreview && (
            <div
              className="theme-preview-image"
              style={{ backgroundImage: `url(${heroPreview})` }}
            />
          )}
          <div className="theme-preview-grid" aria-hidden="true" />
          <div
            className="theme-preview-content"
            style={{ background: surface }}
          >
            <span style={{ color: primary }}>{event.eyebrow}</span>
            <h2>{event.name}</h2>
            <p>
              {event.description ||
                "Tambahkan deskripsi event untuk melihat bagaimana copy tampil."}
            </p>
            <button style={{ background: primary, color: secondary }} type="button">
              Open event pass
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
