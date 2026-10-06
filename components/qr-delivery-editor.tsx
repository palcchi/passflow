"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, QrCode } from "lucide-react";
import type { PassFlowEvent, QrDeliveryMode } from "@/lib/events";
import { saveEventQrConfig } from "@/app/organizer/events/actions";

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

// One credential card: format and how attendees receive it. Layout and artwork are designed in Figma.
export function QrDeliveryEditor({ event, children }: { event: PassFlowEvent; children?: ReactNode }) {
  const [mode, setMode] = useState<QrDeliveryMode>(event.qrConfig.mode);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  function changeMode(value: QrDeliveryMode) {
    if (value === mode || pending) return;
    const previous = mode;
    setMode(value); setMessage(null);
    const data = new FormData();
    data.set("eventId", event.id); data.set("mode", value);
    startTransition(async () => {
      try {
        const result = await saveEventQrConfig(data);
        setMessage({ text: result.message, ok: result.ok });
        if (!result.ok) setMode(previous);
      } catch { setMode(previous); setMessage({ text: "Changes could not be saved. Check your connection and try again.", ok: false }); }
    });
  }

  return (
    <section className="qr-editor-section liquid-panel">
      <div className="qr-editor-header">
        <div>
          <span className="section-kicker">Credential</span>
          <h2>One QR per attendee, in the format you choose.</h2>
          <p>Pick the format and how attendees receive their QR. Size, layout and artwork come from your Figma pass design.</p>
        </div>
        <div className="qr-editor-header-actions">
          <a className="button button-ghost" href={`/organizer/events/${event.id}/design`}>
            Design in Figma
          </a>
        </div>
      </div>

      <h3 className="credential-step"><span>1</span>Format</h3>
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

      {children && <><h3 className="credential-step"><span>2</span>How attendees receive it</h3>
        {mode === "wristband" && event.qrConfig.claimMode !== "claim" && <p className="event-admin-note">Wristbands are usually printed before anyone owns them. Choose “Claim after registration” so attendees link theirs by scanning it.</p>}
        {children}</>}
      {message && <p role={message.ok ? "status" : "alert"} className={`customize-feedback ${message.ok ? "is-success" : "is-error"}`}>{message.text}</p>}
    </section>
  );
}
