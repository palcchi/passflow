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
    <section aria-labelledby="format-title">
      <div className="ui-sectionhead">
        <div>
          <h2 id="format-title" className="ui-h2">Pass format</h2>
          <p>One QR per attendee. Size, layout and artwork come from your Figma pass design.</p>
        </div>
        <a className="ui-btn ui-btn-secondary ui-btn-sm" href={`/organizer/events/${event.id}/design`}>Design in Figma</a>
      </div>
      <div className="ui-options ui-options-4" role="group" aria-label="Pass format">
        {modes.map((item) => (
          <button type="button" key={item.value} className="ui-option" aria-pressed={item.value === mode} disabled={pending} onClick={() => changeMode(item.value)}>
            <span className="ui-option-art" aria-hidden="true"><span className={`ui-format ui-format-${item.value}`} style={{ aspectRatio: item.ratio }}><QrCode size={18} /></span></span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
            {item.value === mode && <span className="ui-option-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
          </button>
        ))}
      </div>
      {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "ui-notice ui-notice-success ui-mt" : "ui-notice ui-notice-danger ui-mt"}>{message.text}</p>}
      {children && <div className="ui-mt-lg">
        <h3 className="ui-h3 ui-mb">How attendees get their QR</h3>
        {mode === "wristband" && event.qrConfig.claimMode !== "claim" && <p className="ui-notice ui-notice-warning ui-mb">Wristbands are usually printed before anyone owns them. Choose Claim after registration so attendees link theirs by scanning it.</p>}
        {children}
      </div>}
    </section>
  );
}
