"use client";

import { useState } from "react";
import { PanelsTopLeft, QrCode } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { EventThemeEditor } from "@/components/event-theme-editor";
import { QrDeliveryEditor } from "@/components/qr-delivery-editor";

export function EventCustomizer({ event }: { event: PassFlowEvent }) {
  const [tab, setTab] = useState("page");
  const tabs = [{ id: "page", label: "Halaman event", icon: PanelsTopLeft }, { id: "pass", label: "Pass & QR", icon: QrCode }];
  return <div className="event-customizer">
    <div className="customizer-tabs" role="tablist" aria-label="Customize event">
      {tabs.map(({ id, label, icon: Icon }, index) => <button key={id} id={`customize-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`customize-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={e => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index;
        setTab(tabs[next].id);
        document.getElementById(`customize-${tabs[next].id}`)?.focus();
      }}><Icon size={16}/>{label}</button>)}
    </div>
    <section id="customize-panel-page" role="tabpanel" aria-labelledby="customize-page" hidden={tab !== "page"}><EventThemeEditor event={event}/></section>
    <section id="customize-panel-pass" role="tabpanel" aria-labelledby="customize-pass" hidden={tab !== "pass"}><QrDeliveryEditor event={event}/></section>
  </div>;
}
