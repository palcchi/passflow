"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ScanLine, ShieldAlert, XCircle } from "lucide-react";
import { validateStationScan } from "@/app/event-actions";

type ScanResult = {
  ok?: boolean;
  decision?: "granted" | "denied" | "invalid" | "already_checked_in" | "already_claimed";
  message?: string;
  attendee_name?: string;
  attendee_code?: string;
  ticket_type?: string;
  display_code?: string;
  reason?: string;
};

type QrScannerProps = {
  stationId: string;
  stationName: string;
  stationMode: string;
};

export function QrScanner({ stationId, stationName, stationMode }: QrScannerProps) {
  const readerId = "passflow-camera-reader";
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lockedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => processCode(decodedText, scanner),
          () => undefined,
        );
      } catch (error) {
        if (!mounted) return;
        setCameraError(error instanceof Error ? error.message : "Camera could not be started.");
      }
    }

    startScanner();
    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) scanner.stop().catch(() => undefined);
    };
  }, [stationId]);

  async function processCode(code: string, scanner = scannerRef.current) {
    if (lockedRef.current || !code.trim()) return;
    lockedRef.current = true;
    try { scanner?.pause(true); } catch {}

    const response = await validateStationScan(stationId, code) as ScanResult;
    setResult(response);
    timeoutRef.current = setTimeout(() => {
      setResult(null);
      lockedRef.current = false;
      setManualCode("");
      try { scanner?.resume(); } catch {}
    }, 3000);
  }

  const decision = result?.decision;
  const positive = decision === "granted";
  const caution = decision === "already_checked_in" || decision === "already_claimed";

  return (
    <div className="scanner-stage">
      <div className="scanner-heading">
        <div><span className="scanner-live-dot" /> LIVE STATION</div>
        <span>{stationName.toUpperCase()} · {stationMode.replaceAll("_", " ").toUpperCase()}</span>
      </div>

      <div className="scanner-camera-shell">
        <div id={readerId} className="scanner-reader" />
        {!result && !cameraError && <div className="scanner-overlay" aria-hidden="true"><div className="scanner-corners" /></div>}

        {result && (
          <div className={`scanner-result ${positive ? "granted" : decision === "invalid" ? "invalid" : "denied"}`}>
            <div className="scanner-result-icon">
              {positive ? <Check size={42} /> : caution ? <ShieldAlert size={42} /> : <XCircle size={42} />}
            </div>
            <span>{decision?.replaceAll("_", " ").toUpperCase() ?? "ERROR"}</span>
            <strong>{result.attendee_name ?? result.message ?? "Validation failed"}</strong>
            <small>{result.ticket_type ? `${result.ticket_type} · ${result.attendee_code ?? ""}` : result.reason ?? ""}</small>
            <div className="scanner-reset-line">Returning to camera in 3 seconds</div>
          </div>
        )}

        {cameraError && (
          <div className="scanner-error-state">
            <ShieldAlert size={36} />
            <strong>Camera unavailable</strong>
            <p>{cameraError}</p>
            <small>Gunakan HTTPS dan izinkan kamera, atau pakai input manual di bawah.</small>
          </div>
        )}
      </div>

      <div className="scanner-instruction">
        <ScanLine size={20} />
        <div>
          <strong>Ready to scan</strong>
          <span>Arahkan QR wristband atau Digital Event Pass ke kamera.</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="min-h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-white placeholder:text-white/50"
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="Manual credential"
        />
        <button className="button button-light" type="button" onClick={() => processCode(manualCode)}>Validate</button>
      </div>
    </div>
  );
}
