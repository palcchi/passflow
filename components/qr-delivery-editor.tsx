"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Download, ImagePlus, Save } from "lucide-react";
import type { PassFlowEvent, QrDeliveryMode } from "@/lib/events";
import { saveEventQrConfig, uploadEventAsset } from "@/app/admin/actions";

const modes: Array<{ value: QrDeliveryMode; label: string; description: string; ratio: string }> = [
  { value: "digital", label: "Digital pass", description: "QR tampil di ponsel attendee", ratio: "1.586" },
  { value: "id_card_portrait", label: "ID card portrait", description: "Kartu tegak untuk badge atau lanyard", ratio: "0.707" },
  { value: "id_card_landscape", label: "ID card landscape", description: "Kartu mendatar untuk akses cepat", ratio: "1.586" },
  { value: "wristband", label: "Wristband", description: "Format strip untuk gelang fisik", ratio: "3.2" },
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
  const selected = useMemo(() => modes.find((item) => item.value === mode) ?? modes[0], [mode]);

  function save() {
    const data = new FormData();
    data.set("eventId", event.id); data.set("mode", mode); data.set("widthMm", String(widthMm)); data.set("heightMm", String(heightMm)); data.set("qrX", String(qrX)); data.set("qrY", String(qrY)); data.set("qrSize", String(qrSize));
    startTransition(async () => { await saveEventQrConfig(data); setMessage("QR delivery tersimpan."); });
  }

  return <section className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="section-kicker">QR delivery</span><h2 className="mt-2 text-2xl font-semibold">Pilih bentuk pass yang paling sesuai.</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Digital otomatis aktif untuk pendaftar. Jika memilih format fisik, template dan posisi QR dapat disesuaikan sebelum export.</p></div><div className="flex flex-wrap gap-2"><a className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}><Download size={16}/> Preview export</a><a className="button button-dark" href={`/admin/events/${event.id}/export/figma`}><Download size={16}/> Export untuk Figma</a></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{modes.map((item) => <button type="button" key={item.value} className="qr-mode-card text-left" data-active={item.value === mode} onClick={() => setMode(item.value)}><span className="mb-4 block h-20 w-full rounded-lg border border-border bg-muted" style={{ aspectRatio: item.ratio }} /><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></button>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Lebar template (mm)<input type="number" min="20" max="500" step="0.1" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3"/></label><label className="text-sm font-medium">Tinggi template (mm)<input type="number" min="20" max="500" step="0.1" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3"/></label><label className="text-sm font-medium">Posisi X (%)<input type="range" min="0" max="100" value={qrX} onChange={(e) => setQrX(Number(e.target.value))} className="mt-4 w-full"/><span className="text-xs text-muted-foreground">{qrX}%</span></label><label className="text-sm font-medium">Posisi Y (%)<input type="range" min="0" max="100" value={qrY} onChange={(e) => setQrY(Number(e.target.value))} className="mt-4 w-full"/><span className="text-xs text-muted-foreground">{qrY}%</span></label><label className="text-sm font-medium">Ukuran QR (%)<input type="range" min="8" max="50" value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="mt-4 w-full"/><span className="text-xs text-muted-foreground">{qrSize}%</span></label></div>
      <div className="qr-config-preview" style={{ aspectRatio: selected.ratio }}>{templateUrl && <Image src={templateUrl} alt="Template pass" fill unoptimized sizes="320px"/>}<div className="qr-config-preview-mark" style={{ left: `${qrX}%`, top: `${qrY}%`, width: `${qrSize}%` }}>QR</div></div>
    </div>
    <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-[1fr_auto] sm:items-end"><div><span className="field-label">Template fisik</span><form action={uploadEventAsset} className="mt-2 flex flex-wrap items-center gap-3"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="assetType" value="qr_template"/><label className="upload-zone min-w-[240px]"><ImagePlus size={18}/><strong>{templateUrl ? "Ganti template" : "Upload template"}</strong><span>PNG, JPG, WEBP · max 5 MB</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp" required onChange={(e) => { const file = e.target.files?.[0]; if (file) setTemplateUrl(URL.createObjectURL(file)); }}/></label><button className="button button-ghost" type="submit">Upload</button></form></div><button className="button button-dark" type="button" disabled={pending} onClick={save}><Save size={16}/> {pending ? "Menyimpan..." : "Simpan QR"}</button></div>
    {message && <p className="mt-3 text-sm text-success">{message}</p>}
    <div className="figma-export-note mt-4"><strong>Alur Figma</strong><span>Export SVG ini bisa langsung di-drag ke Figma. Nama event, warna tema, template, teks, dan posisi QR tetap terpisah agar mudah disesuaikan sebelum final print.</span></div>
  </section>;
}
