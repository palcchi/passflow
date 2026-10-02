"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, LoaderCircle, ShieldAlert, SwitchCamera } from "lucide-react";
import { ManualCheckIn } from "./manual-check-in";

type Device = { id: string; label: string };
type Result = { status: string; message: string; name?: string };

export function QrScanner({ stationId, stationName, eventName, venue, mode }: {
  stationId: string; stationName: string; eventName: string; venue: string; mode: string;
}) {
  const readerId = useId().replace(/:/g, "");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState("");
  const [active, setActive] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [decodeHint, setDecodeHint] = useState(false);
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cameraCleanup = useRef<Promise<void>>(Promise.resolve());
  const recoveryAttempts = useRef(0);

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  async function discover() {
    setDiscovering(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const available = await Html5Qrcode.getCameras();
      setDevices(available);
      setSelected(available.find(device => /back|rear|environment|belakang/i.test(device.label))?.id ?? available[0]?.id ?? "");
      if (!available.length) setError("No camera was detected. Connect a camera and try again.");
    } catch {
      setError("Camera access is blocked. Allow camera access in your browser settings, then try again.");
    } finally { setDiscovering(false); }
  }

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    let visibilityTimer: ReturnType<typeof setTimeout> | undefined;
    let videoTrack: MediaStreamTrack | undefined;
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
          disableFlip: true,
        }, async code => {
          if (locked || disposed) return;
          setDecodeHint(false);
          clearTimeout(hintTimer);
          locked = true;
          setValidating(true);
          try {
            if (!navigator.onLine) throw new Error("offline");
            const response = await fetch("/api/scan", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ station: stationId, code }),
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
            });
            const data = await response.json();
            if (disposed) return;
            const sessionExpired = response.status === 401 || data?.reason === "unauthenticated";
            const serviceUnavailable = response.status >= 500 ||
              ["rate_limited", "validation_failed", "station_not_found", "event_not_live", "forbidden"].includes(data?.reason);
            const status = sessionExpired ? "session_expired" : serviceUnavailable ? "network_error" :
              response.ok ? data?.decision ?? (data?.ok ? "granted" : "invalid") : "invalid";
            navigator.vibrate?.(status === "granted" ? 40 : [70, 50, 70]);
            setResult({
              status: sessionExpired ? "session_expired" : serviceUnavailable ? "network_error" :
                response.ok ? data?.decision ?? (data?.ok ? "granted" : "invalid") : "invalid",
              message: sessionExpired ? "Your session has expired. Please sign in again." :
                serviceUnavailable ? "Validation is unavailable right now. Check the station or connection and retry." :
                data?.message ?? (response.ok ? "Validation complete." : "Could not validate this pass. Retry the scan."),
              name: data?.attendee_name,
            });
          } catch (cause) {
            if (disposed) return;
            const reason = cause instanceof Error ? cause.name : "";
            setResult({ status: "network_error", message: !navigator.onLine ? "Device is offline. Reconnect before scanning again." :
              reason === "TimeoutError" ? "Validation timed out. Check the connection and scan again." :
              "The connection was interrupted. Scan the QR code again." });
          }
          if (disposed) return;
          setValidating(false);
          timer = setTimeout(() => { setResult(null); locked = false; }, 3000);
        }, () => {});
        if (!disposed) {
          setReady(true);
          hintTimer = setTimeout(() => { if (!disposed && !locked) setDecodeHint(true); }, 12000);
          const video = document.getElementById(readerId)?.querySelector("video");
          videoTrack = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0];
          videoTrack?.addEventListener("ended", recover);
          document.addEventListener("visibilitychange", checkCamera);
        }
      } catch {
        if (!disposed) setError("The camera could not start. It may be in use by another application. Select the camera again to retry.");
      }
    })();
    return () => {
      disposed = true;
      request.abort();
      clearTimeout(timer);
      clearTimeout(hintTimer);
      clearTimeout(visibilityTimer);
      videoTrack?.removeEventListener("ended", recover);
      document.removeEventListener("visibilitychange", checkCamera);
      document.body.style.overflow = previousOverflow;
      cameraCleanup.current = running.finally(async () => {
        if (scanner?.isScanning) await scanner.stop().catch(() => {});
        try { scanner?.clear(); } catch {}
      });
    };
    function recover() {
      if (disposed) return;
      setReady(false);
      setDecodeHint(false);
      if (recoveryAttempts.current++ < 1) setCameraEpoch(value => value + 1);
      else setError("Camera was interrupted. Choose a camera to continue.");
    }
    function checkCamera() {
      if (document.hidden || disposed) return;
      clearTimeout(visibilityTimer);
      visibilityTimer = setTimeout(() => {
        const video = document.getElementById(readerId)?.querySelector("video");
        if (!disposed && (videoTrack?.readyState === "ended" || video?.paused)) recover();
      }, 800);
    }
  }, [active, cameraEpoch, readerId, stationId]);

  const success = result?.status === "granted";
  const titles: Record<string, string> = { granted: "Access granted.", denied: "Access denied.", already_checked_in: "Already checked in.", already_claimed: "Already claimed.", invalid: "Invalid pass.", network_error: "Unable to validate.", session_expired: "Session expired." };

  if (!active) return <main className="camera-setup">
    <Link href="/account" className="camera-back"><ArrowLeft size={18}/> Back</Link>
    <section className="camera-setup-panel">
      <span className="camera-eyebrow">PassFlow Scanner</span>
      <h1>{eventName}</h1>
      <p className="camera-place">{venue || "Venue not specified"}<span>{stationName}</span></p>
      <div className="camera-setup-divider"/>
      <h2>Select a camera.<br/><span>Ready for check-in.</span></h2>
      <p>Select the camera on this device before scanning attendee QR codes.</p>
      <button className="camera-discover" onClick={discover} disabled={discovering}>
        {discovering ? <LoaderCircle className="animate-spin" size={18}/> : <Camera size={18}/>}
        {discovering ? "Detecting cameras…" : devices.length ? "Detect cameras again" : "Allow & detect cameras"}
      </button>
      {!!devices.length && <fieldset className="camera-device-list"><legend>Detected cameras</legend>
        {devices.map((device, index) => <label key={device.id} data-selected={selected === device.id}>
          <Camera size={20}/><span>{device.label || `Camera ${index + 1}`}</span>
          <input type="radio" name="camera" value={device.id} checked={selected === device.id} onChange={() => setSelected(device.id)}/>
        </label>)}
      </fieldset>}
      {error && <p role="alert" className="camera-feedback">{error}</p>}
      {!online && <p role="alert" className="camera-feedback">Device is offline. Reconnect before scanning passes.</p>}
      <button className="camera-start" disabled={!selected || discovering} onClick={() => { recoveryAttempts.current = 0; setError(""); setReady(false); setResult(null); setValidating(false); setDecodeHint(false); setActive(selected); }}>Start scanning <ArrowLeft className="rotate-180" size={18}/></button>
      {mode === "check_in" && <ManualCheckIn stationId={stationId} open={manualOpen} onOpenChange={setManualOpen}/>}
    </section>
  </main>;

  return <main className="camera-live">
    <div id={readerId} className="camera-live-reader"/>
    <header className="camera-live-header">
      <button onClick={() => { setActive(""); setResult(null); setReady(false); setValidating(false); setError(""); }} aria-label="Return to camera selection"><SwitchCamera size={20}/></button>
      <div><span>PassFlow · {stationName}</span><h1>{eventName}</h1><p>{venue || stationName}</p></div>
      <span className="camera-live-status">{!online ? "OFFLINE" : validating ? "CHECKING" : ready && !error ? "LIVE" : "…"}</span>
    </header>
    {!ready && !error && <div className="camera-live-loading" role="status"><LoaderCircle className="animate-spin"/> Starting camera…</div>}
    {validating && !result && !error && <div className="camera-live-loading" role="status"><LoaderCircle className="animate-spin"/> Checking access…</div>}
    {error && <div className="camera-verdict" role="alert"><ShieldAlert size={42}/><h2>Camera not ready.</h2><p>{error}</p><button onClick={() => { setActive(""); setError(""); }}>Choose another camera</button>{mode === "check_in" && <button onClick={() => { setActive(""); setError(""); setManualOpen(true); }}>Look up attendee</button>}</div>}
    {result && <div className="camera-verdict" data-success={success} role="status" aria-live="polite">
      {success ? <Check size={48}/> : <ShieldAlert size={48}/>}
      <h2>{titles[result.status] ?? "Check this pass."}</h2>
      {result.name && <strong>{result.name}</strong>}<p>{result.message}</p><small>Ready for the next scan in 3 seconds</small>
    </div>}
    {!result && !error && <footer className="camera-live-footer"><strong>{decodeHint ? "QR not detected yet. Improve lighting, hold the code flat and move closer." : ready ? "Hold the QR code in front of the camera." : "Please wait."}</strong><span>Digital pass · ID card · Wristband</span></footer>}
  </main>;
}
