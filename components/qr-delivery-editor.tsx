"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Check, QrCode } from "lucide-react";
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
    description: "Display the QR pass on the attendee’s phone",
    ratio: "1.586",
  },
  {
    value: "id_card_portrait",
    label: "ID card portrait",
    description: "Portrait card for badges or lanyards",
    ratio: "0.707",
  },
  {
    value: "id_card_landscape",
    label: "ID card landscape",
    description: "Landscape card for quick access",
    ratio: "1.586",
  },
  {
    value: "wristband",
    label: "Wristband",
    description: "Strip format for physical wristbands",
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
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => modes.find((item) => item.value === mode) ?? modes[0], [mode]);

  const validDimensions = widthMm >= 20 && widthMm <= 500 && heightMm >= 20 && heightMm <= 500;
  const ratio = validDimensions ? widthMm / heightMm : Number(selected.ratio);
  const qrHalfHeight = qrSize * ratio / 2;
  const qrFits = qrX >= qrSize / 2 && qrX <= 100 - qrSize / 2 && qrY >= qrHalfHeight && qrY <= 100 - qrHalfHeight;
  function changeMode(value: QrDeliveryMode) {
    setMode(value);
    const sizes = { digital: [85.6, 54], id_card_portrait: [54, 85.6], id_card_landscape: [85.6, 54], wristband: [240, 25] };
    setWidthMm(sizes[value][0]); setHeightMm(sizes[value][1]);
    setQrSize(value === "wristband" ? 8 : 22); setQrX(value === "wristband" ? 85 : 68); setQrY(50);
    setMessage(null); setSuccess(false);
  }
  function save() {
    if (!validDimensions || !qrFits || pending) return;
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
      try {
        const result = await saveEventQrConfig(data);
        setSuccess(result.ok); setMessage(result.message);
      } catch { setSuccess(false); setMessage("Changes could not be saved. Check your connection and try again."); }
    });
  }

  return (
    <section className="qr-editor-section liquid-panel" onChangeCapture={() => {setMessage(null); setSuccess(false);}}>
      <div className="qr-editor-header">
        <div>
          <span className="section-kicker">QR delivery</span>
          <h2>One pass, multiple formats.</h2>
          <p>
            Pass layout and QR placement are configured here. Credential delivery to attendees
            is configured separately in Access.
          </p>
        </div>
        <div className="qr-editor-header-actions">
          <a className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}>
            Preview export
          </a>
        </div>
      </div>

      <div className="qr-mode-grid">
        {modes.map((item) => (
          <button
            type="button"
            key={item.value}
            className="qr-mode-card"
            data-active={item.value === mode}
            aria-pressed={item.value === mode}
            disabled={pending}
            onClick={() => changeMode(item.value)}
          >
            <span className="qr-mode-stage" aria-hidden="true"><span className={`qr-mode-preview qr-mode-${item.value}`} style={{ aspectRatio: item.ratio }}><QrCode size={23}/><i/><i/></span></span>
            <span className="qr-mode-copy">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            {item.value === mode && <span className="qr-mode-check" aria-hidden="true"><Check size={12}/></span>}
          </button>
        ))}
      </div>

      <div className="qr-editor-workspace">
        <fieldset className="qr-control-panel" disabled={pending}><legend className="sr-only">QR size and position</legend>
          <div className="qr-dimension-grid">
            <label>
              <span>Template width</span>
              <div className="number-unit-field">
                <input
                  type="number"
                  inputMode="decimal"
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
              <span>Template height</span>
              <div className="number-unit-field">
                <input
                  type="number"
                  inputMode="decimal"
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
              { label: "X position", value: qrX, set: setQrX, min: 0, max: 100 },
              { label: "Y position", value: qrY, set: setQrY, min: 0, max: 100 },
              { label: "QR size", value: qrSize, set: setQrSize, min: 8, max: 50 },
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
            <span className="field-label">Physical template</span>
            <AssetUploadCard
              eventId={event.id}
              assetType="qr_template"
              label={templateUrl ? "Replace template" : "Upload template"}
              currentUrl={templateUrl}
              compact
              onPreview={setTemplateUrl}
              onUploaded={setTemplateUrl}
            />
          </div>

          <div className="qr-save-row">
            {message && <span role={success ? "status" : "alert"} className={`customize-feedback ${success ? "is-success" : "is-error"}`}>{message}</span>}
            {!validDimensions && <p role="alert" className="customize-feedback is-error">Template dimensions must be between 20 and 500 mm.</p>}
            {validDimensions && !qrFits && <p role="alert" className="customize-feedback is-error">The QR code extends beyond the pass boundary. Adjust its position or size.</p>}
            <button className="button button-dark" type="button" disabled={pending || !validDimensions || !qrFits} onClick={save}>
              {pending ? "Saving..." : message && success ? "Saved" : "Save QR settings"}
            </button>
          </div>
        </fieldset>

        <div className="qr-preview-panel">
          <div className="preview-toolbar">
            <span className="field-label">Pass preview</span>
            <span>{selected.label}</span>
          </div>
          <div
            className="qr-config-preview"
            style={{ aspectRatio: ratio, maxWidth: ratio * 440 }}
          >
            {templateUrl && (
              <Image
                src={templateUrl}
                alt="Pass template"
                fill
                unoptimized
                sizes="(max-width: 900px) 100vw, 380px"
              />
            )}
            <div
              className="qr-config-preview-mark"
              style={{
                left: `${qrX}%`,
                top: `${qrY}%`,
                width: `${qrSize}%`,
              }}
            >
              <QrCode aria-hidden="true"/><span className="sr-only">Example QR position</span>
            </div>
          </div>
          <p className="customize-preview-note">{widthMm} × {heightMm} mm · Example QR only, not an active credential.</p>
        </div>
      </div>
    </section>
  );
}
