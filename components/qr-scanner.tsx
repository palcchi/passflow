"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, LoaderCircle, ShieldAlert, SwitchCamera } from "lucide-react";

type Device = { id: string; label: string };
type Result = { status: string; message: string; name?: string };

export function QrScanner({ stationId, stationName, eventName, venue }: {
  stationId: string; stationName: string; eventName: string; venue: string;
}) {
  const readerId = useId().replace(/:/g, "");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState("");
  const [active, setActive] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cameraCleanup = useRef<Promise<void>>(Promise.resolve());

  async function discover() {
    setDiscovering(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const available = await Html5Qrcode.getCameras();
      setDevices(available);
      setSelected(available.find(device => /back|rear|environment|belakang/i.test(device.label))?.id ?? available[0]?.id ?? "");
      if (!available.length) setError("Tidak ada kamera terdeteksi. Sambungkan kamera lalu coba lagi.");
    } catch {
      setError("Kamera belum dapat diakses. Izinkan akses kamera di pengaturan browser, lalu coba lagi.");
    } finally { setDiscovering(false); }
  }

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    const request = new AbortController();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const running = (async () => {
      try {
        await cameraCleanup.current;
        if (disposed) return;
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        scanner = new Html5Qrcode(readerId);
        await scanner.start({ deviceId: { exact: active } }, {
          fps: 10,
          qrbox: (width, height) => { const size = Math.floor(Math.min(width, height) * .68); return { width: size, height: size }; },
        }, async code => {
          if (locked || disposed) return;
          locked = true;
          try {
            const response = await fetch("/api/scan", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ station: stationId, code }),
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
            });
            const data = await response.json();
            if (disposed) return;
            setResult({
              status: response.ok ? data?.decision ?? (data?.ok ? "granted" : "invalid") : "invalid",
              message: response.status === 401 ? "Sesi berakhir. Silakan masuk kembali." : data?.message ?? "Validasi selesai.",
              name: data?.attendee_name,
            });
          } catch {
            if (disposed) return;
            setResult({ status: "invalid", message: "Koneksi terputus atau terlalu lama. Silakan scan ulang." });
          }
          if (disposed) return;
          timer = setTimeout(() => { setResult(null); locked = false; }, 3000);
        }, () => {});
        if (!disposed) setReady(true);
      } catch {
        if (!disposed) setError("Kamera tidak dapat dinyalakan. Kamera mungkin sedang dipakai aplikasi lain. Pilih ulang kamera untuk mencoba lagi.");
      }
    })();
    return () => {
      disposed = true;
      request.abort();
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      cameraCleanup.current = running.finally(async () => {
        if (scanner?.isScanning) await scanner.stop().catch(() => {});
        try { scanner?.clear(); } catch {}
      });
    };
  }, [active, readerId, stationId]);

  const success = result?.status === "granted";
  const titles: Record<string, string> = { granted: "Akses diterima.", denied: "Akses ditolak.", already_checked_in: "Sudah check-in.", already_claimed: "Sudah diklaim.", invalid: "Pass tidak valid." };

  if (!active) return <main className="camera-setup">
    <Link href="/account" className="camera-back"><ArrowLeft size={18}/> Kembali</Link>
    <section className="camera-setup-panel">
      <span className="camera-eyebrow">PassFlow Scanner</span>
      <h1>{eventName}</h1>
      <p className="camera-place">{venue || "Lokasi belum ditentukan"}<span>{stationName}</span></p>
      <div className="camera-setup-divider"/>
      <h2>Pilih kamera.<br/><span>Siap menerima tamu.</span></h2>
      <p>Pilih kamera perangkat ini sebelum mulai memindai QR.</p>
      <button className="camera-discover" onClick={discover} disabled={discovering}>
        {discovering ? <LoaderCircle className="animate-spin" size={18}/> : <Camera size={18}/>}
        {discovering ? "Mendeteksi kamera…" : devices.length ? "Deteksi ulang kamera" : "Izinkan & deteksi kamera"}
      </button>
      {!!devices.length && <fieldset className="camera-device-list"><legend>Kamera terdeteksi</legend>
        {devices.map((device, index) => <label key={device.id} data-selected={selected === device.id}>
          <Camera size={20}/><span>{device.label || `Kamera ${index + 1}`}</span>
          <input type="radio" name="camera" value={device.id} checked={selected === device.id} onChange={() => setSelected(device.id)}/>
        </label>)}
      </fieldset>}
      {error && <p role="alert" className="camera-feedback">{error}</p>}
      <button className="camera-start" disabled={!selected || discovering} onClick={() => { setError(""); setReady(false); setResult(null); setActive(selected); }}>Mulai scan <ArrowLeft className="rotate-180" size={18}/></button>
    </section>
  </main>;

  return <main className="camera-live">
    <div id={readerId} className="camera-live-reader"/>
    <header className="camera-live-header">
      <button onClick={() => { setActive(""); setResult(null); setReady(false); setError(""); }} aria-label="Kembali ke pilihan kamera"><SwitchCamera size={20}/></button>
      <div><span>PassFlow · {stationName}</span><h1>{eventName}</h1><p>{venue || stationName}</p></div>
      <span className="camera-live-status">{ready && !error ? "LIVE" : "…"}</span>
    </header>
    {!ready && !error && <div className="camera-live-loading" role="status"><LoaderCircle className="animate-spin"/> Menyalakan kamera…</div>}
    {error && <div className="camera-verdict" role="alert"><ShieldAlert size={42}/><h2>Kamera belum siap.</h2><p>{error}</p><button onClick={() => { setActive(""); setError(""); }}>Pilih kamera lagi</button></div>}
    {result && <div className="camera-verdict" data-success={success} role="status" aria-live="polite">
      {success ? <Check size={48}/> : <ShieldAlert size={48}/>}
      <h2>{titles[result.status] ?? "Periksa pass."}</h2>
      {result.name && <strong>{result.name}</strong>}<p>{result.message}</p><small>Siap scan berikutnya dalam 3 detik</small>
    </div>}
    {!result && !error && <footer className="camera-live-footer"><strong>{ready ? "Arahkan QR ke kamera." : "Tunggu sebentar."}</strong><span>Digital pass · ID card · Wristband</span></footer>}
  </main>;
}
