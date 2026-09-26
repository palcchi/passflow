"use client";

import { useEffect, useRef, useState, useId } from "react";

export function WristbandInput() {
  const id = useId().replaceAll(":", "");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: {width:200,height:200} }, value => {
          if (disposed) return;
          setCode(value);
          setActive(false);
        }, () => {});
        if (disposed) await scanner.stop().catch(() => {});
      } catch {
        if (!disposed) setError("Kamera tidak tersedia. Izinkan kamera atau tempel isi QR secara manual.");
      }
    }
    void start();
    return () => {
      disposed = true;
      if (scanner?.isScanning) void scanner.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [active, id]);
  return <div className="space-y-3">
    <button className="button button-ghost w-full" type="button" onClick={() => {setError("");setActive(!active);}}>{active ? "Tutup kamera" : "Scan QR wristband"}</button>
    {active && <div id={id} className="min-h-64 overflow-hidden rounded-md" />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <label className="block text-sm">Isi QR wristband
      <input name="code" required maxLength={256} value={code} onChange={e=>setCode(e.target.value)} placeholder="PF1:…" className="mt-2 min-h-12 w-full rounded-md border border-border px-3" />
    </label>
    <p className="text-xs text-muted-foreground">Scan atau tempel isi QR, bukan nomor label WR. Periksa lalu tekan tombol konfirmasi.</p>
  </div>;
}
