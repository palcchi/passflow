"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Check, Download, Save, ScanLine } from "lucide-react";
import type { PassFlowEvent, QrDeliveryMode } from "@/lib/events";
import { saveEventQrConfig } from "@/app/admin/actions";
import { AssetUploadCard } from "@/components/asset-upload-card";

const modes: Array<{
  value: QrDeliveryMode;
  label: string;
  description: string;
  ratio: string;
}> = [
  {
    value: "digital",
    label: "Digital pass",
    description: "QR tampil di ponsel attendee",
    ratio: "1.586",
  },
  {
    value: "id_card_portrait",
    label: "ID card portrait",
    description: "Kartu tegak untuk badge atau lanyard",
    ratio: "0.707",
  },
  {
    value: "id_card_landscape",
    label: "ID card landscape",
    description: "Kartu mendatar untuk akses cepat",
    ratio: "1.586",
  },
  {
    value: "wristband",
    label: "Wristband",
    description: "Format strip untuk gelang fisik",
    ratio: "3.2",
  },
];

export function QrDeliveryEditor({ event }: { event: PassFlowEvent }) {
  const [mode, setMode] = useState<QrDeliveryMode>(event.qrConfig.mode);
  const [templateUrl, setTemplateUrl] = useState(event.qrConfig.templateUrl);
  const [qrX, setQrX] = useState(event.qrConfig.qrX);
  const [qrY, setQrY] = useState(event.qrConfig.qrY);
  const [qrSize, setQrSize] = useState(event.qrConfig.qrSize);
  const [widthMm, setWidthMm] = useState(event.qrConfig.widthMm);
  const [heightMm, setHeightMm] = useState(event.qrConfig.heightMm);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const selected = useMemo(() => modes.find((item) => item.value === mode) ?? modes[0], [mode]);

  function save() {
    const data = new FormData();
    data.set("eventId", event.id);
    data.set("mode", mode);
    data.set("widthMm", String(widthMm));
    data.set("heightMm", String(heightMm));
    data.set("qrX", String(qrX));
    data.set("qrY", String(qrY));
    data.set("qrSize", String(qrSize));
    setMessage(null);
    startTransition(async () => {
      await saveEventQrConfig(data);
      setMessage("QR delivery tersimpan.");
    });
  }

  return (
    <section className="qr-editor-section liquid-panel">
      <div className="qr-editor-header">
        <div>
          <span className="section-kicker">QR delivery</span>
          <h2>Pilih bentuk pass yang paling sesuai.</h2>
          <p>
            Digital aktif otomatis untuk pendaftar. Format fisik memakai template yang bisa
            kamu posisikan secara presisi sebelum export.
          </p>
        </div>
        <div className="qr-editor-header-actions">
          <a className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}>
            <Download size={16} /> Preview export
          </a>
          <a className="button button-dark" href={`/admin/events/${event.id}/export/figma`}>
            <Download size={16} /> Export Figma
          </a>
        </div>
      </div>

      <div className="qr-mode-grid">
        {modes.map((item) => (
          <motion.button
            type="button"
            key={item.value}
            className="qr-mode-card"
            data-active={item.value === mode}
            onClick={() => setMode(item.value)}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          >
            <span className="qr-mode-preview" style={{ aspectRatio: item.ratio }}>
              <ScanLine size={18} />
            </span>
            <span className="qr-mode-copy">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            {item.value === mode && (
              <span className="qr-mode-check">
                <Check size={13} />
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="qr-editor-workspace">
        <div className="qr-control-panel">
          <div className="qr-dimension-grid">
            <label>
              <span>Lebar template</span>
              <div className="number-unit-field">
                <input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  value={widthMm}
                  onChange={(event) => setWidthMm(Number(event.target.value))}
                />
                <small>mm</small>
              </div>
            </label>
            <label>
              <span>Tinggi template</span>
              <div className="number-unit-field">
                <input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  value={heightMm}
                  onChange={(event) => setHeightMm(Number(event.target.value))}
                />
                <small>mm</small>
              </div>
            </label>
          </div>

          <div className="qr-slider-stack">
            {[
              { label: "Posisi X", value: qrX, set: setQrX, min: 0, max: 100 },
              { label: "Posisi Y", value: qrY, set: setQrY, min: 0, max: 100 },
              { label: "Ukuran QR", value: qrSize, set: setQrSize, min: 8, max: 50 },
            ].map((item) => (
              <label className="range-field" key={item.label}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.value}%</small>
                </span>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  value={item.value}
                  onChange={(event) => item.set(Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <div className="qr-template-upload">
            <span className="field-label">Template fisik</span>
            <AssetUploadCard
              eventId={event.id}
              assetType="qr_template"
              label={templateUrl ? "Ganti template" : "Upload template"}
              currentUrl={templateUrl}
              compact
              onPreview={setTemplateUrl}
              onUploaded={setTemplateUrl}
            />
          </div>

          <div className="qr-save-row">
            {message && <span className="editor-inline-success">{message}</span>}
            <button className="button button-dark" type="button" disabled={pending} onClick={save}>
              {message && !pending ? <Check size={16} /> : <Save size={16} />}
              {pending ? "Menyimpan..." : message ? "Tersimpan" : "Simpan QR"}
            </button>
          </div>
        </div>

        <div className="qr-preview-panel">
          <div className="preview-toolbar">
            <span className="field-label">Pass preview</span>
            <span>{selected.label}</span>
          </div>
          <motion.div
            className="qr-config-preview"
            style={{ aspectRatio: selected.ratio }}
            layout
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            {templateUrl && (
              <Image
                src={templateUrl}
                alt="Template pass"
                fill
                unoptimized
                sizes="(max-width: 900px) 100vw, 380px"
              />
            )}
            <motion.div
              className="qr-config-preview-mark"
              animate={{
                left: `${qrX}%`,
                top: `${qrY}%`,
                width: `${qrSize}%`,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              QR
            </motion.div>
          </motion.div>
          <div className="figma-export-note">
            <strong>Figma-ready</strong>
            <span>
              Nama event, warna tema, template, teks, dan posisi QR tetap terpisah agar mudah
              disesuaikan sebelum final print.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
