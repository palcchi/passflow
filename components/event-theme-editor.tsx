"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ImagePlus, RotateCcw, Save } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";

export function EventThemeEditor({ event }: { event: PassFlowEvent }) {
  const [primary, setPrimary] = useState(event.theme.primary);
  const [background, setBackground] = useState(event.theme.background);
  const [foreground, setForeground] = useState(event.theme.foreground);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  const previewStyle = useMemo(
    () => ({
      background,
      color: foreground,
      borderColor: primary,
    }),
    [background, foreground, primary]
  );

  function handleHero(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setHeroPreview(URL.createObjectURL(file));
  }

  return (
    <div className="theme-editor-grid">
      <section className="theme-controls">
        <div className="control-block">
          <span className="field-label">Brand colors</span>
          <label className="color-field">
            <span>Primary</span>
            <div>
              <input
                type="color"
                value={primary}
                onChange={(event) => setPrimary(event.target.value)}
              />
              <code>{primary}</code>
            </div>
          </label>
          <label className="color-field">
            <span>Background</span>
            <div>
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
              <code>{background}</code>
            </div>
          </label>
          <label className="color-field">
            <span>Text</span>
            <div>
              <input
                type="color"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
              />
              <code>{foreground}</code>
            </div>
          </label>
        </div>

        <div className="control-block">
          <span className="field-label">Hero image</span>
          <label className="upload-zone">
            <ImagePlus size={22} />
            <strong>Upload preview</strong>
            <span>JPG, PNG, WEBP</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHero} />
          </label>
          <small className="form-note">
            Preview lokal dulu. Persist ke Supabase Storage akan dipasang setelah project Supabase dibuat.
          </small>
        </div>

        <div className="theme-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              setPrimary(event.theme.primary);
              setBackground(event.theme.background);
              setForeground(event.theme.foreground);
              setHeroPreview(null);
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button className="button button-dark" type="button">
            <Save size={16} />
            Save theme
          </button>
        </div>
      </section>

      <section className="theme-preview-wrap">
        <span className="field-label">Live preview</span>
        <div className="theme-preview" style={previewStyle}>
          {heroPreview && (
            <div
              className="theme-preview-image"
              style={{ backgroundImage: `url(${heroPreview})` }}
            />
          )}
          <div className="theme-preview-content">
            <span style={{ color: primary }}>{event.eyebrow}</span>
            <h2>{event.name}</h2>
            <p>{event.description}</p>
            <button style={{ background: primary }} type="button">
              Open event pass
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
