"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, RotateCcw, Save, Sparkles } from "lucide-react";
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
  const [headerStyle, setHeaderStyle] = useState(event.theme.headerStyle ?? "editorial");
  const [heroPreview, setHeroPreview] = useState<string | null>(event.heroImageUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const previewStyle = useMemo(
    () => ({
      background,
      color: foreground,
      borderColor: primary,
    }),
    [background, foreground, primary],
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
      <motion.section
        className="theme-controls liquid-panel"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.28 }}
      >
        <div className="editor-panel-heading">
          <div>
            <span className="section-kicker">Brand system</span>
            <h2>Visual identity</h2>
          </div>
          <span className="editor-status-pill">
            <Sparkles size={13} />
            Live
          </span>
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
                <span className="color-picker-shell" style={{ background: item.value }}>
                  <input
                    aria-label={`Pilih warna ${item.label}`}
                    type="color"
                    value={item.value}
                    onChange={(event) => item.set(event.target.value)}
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
              { value: "minimal", label: "Minimal", description: "Fokus ke judul dan CTA" },
              { value: "editorial", label: "Editorial", description: "Visual besar dan informasi event" },
              { value: "split", label: "Split", description: "Copy dan visual seimbang" },
            ]}
          />
          <p className="form-note">
            Struktur header akan berubah langsung di preview sebelum disimpan.
          </p>
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

        <div className="theme-actions sticky-actions">
          <button className="button button-ghost" type="button" onClick={resetTheme}>
            <RotateCcw size={16} /> Reset
          </button>
          <button className="button button-dark" type="button" disabled={pending} onClick={saveTheme}>
            {pending ? <span className="loading-dot" /> : message ? <Check size={16} /> : <Save size={16} />}
            {pending ? "Saving..." : message ? "Saved" : "Save theme"}
          </button>
        </div>
        {message && <p className="editor-inline-success">{message}</p>}
      </motion.section>

      <section className="theme-preview-wrap">
        <div className="preview-toolbar">
          <span className="field-label">Live preview</span>
          <span>{headerStyle}</span>
        </div>

        <motion.div
          className={`theme-preview theme-preview-${headerStyle}`}
          style={previewStyle}
          layout
          transition={{ duration: reduceMotion ? 0 : 0.24 }}
        >
          {heroPreview && (
            <motion.div
              key={heroPreview}
              className="theme-preview-image"
              style={{ backgroundImage: `url(${heroPreview})` }}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: reduceMotion ? 0 : 0.24 }}
            />
          )}
          <div className="preview-glass-orb preview-glass-orb-one" />
          <div className="preview-glass-orb preview-glass-orb-two" />
          <motion.div
            className="theme-preview-content liquid-panel"
            style={{ background: `color-mix(in srgb, ${surface} 90%, transparent)` }}
            layout
          >
            <span style={{ color: primary }}>{event.eyebrow}</span>
            <h2>{event.name}</h2>
            <p>{event.description || "Tambahkan deskripsi event untuk melihat bagaimana copy tampil di layout ini."}</p>
            <button style={{ background: primary, color: secondary }} type="button">
              Open event pass
            </button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
