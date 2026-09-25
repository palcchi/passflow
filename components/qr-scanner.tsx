"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ScanLine, ShieldAlert } from "lucide-react";

type ScanResult = {
  status: "granted" | "invalid";
  code: string;
};

type QrScannerProps = {
  stationId: string;
};

export function QrScanner({ stationId }: QrScannerProps) {
  const readerId = "passflow-camera-reader";
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lockedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (lockedRef.current) return;
            lockedRef.current = true;

            const isRecognized =
              decodedText.startsWith("WR-") ||
              decodedText.includes("/pass/") ||
              decodedText.includes("passflow");

            setResult({
              status: isRecognized ? "granted" : "invalid",
              code: decodedText,
            });

            try {
              scanner.pause(true);
            } catch {
              // Scanner may already be paused while the browser settles.
            }

            timeoutRef.current = setTimeout(() => {
              setResult(null);
              lockedRef.current = false;
              try {
                scanner.resume();
              } catch {
                // The component may be unmounting.
              }
            }, 3000);
          },
          () => {
            // Continuous scan errors are expected while no QR is in frame.
          }
        );
      } catch (error) {
        if (!mounted) return;
        setCameraError(
          error instanceof Error
            ? error.message
            : "Camera could not be started."
        );
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        scanner.stop().catch(() => undefined);
      }
    };
  }, []);

  return (
    <div className="scanner-stage">
      <div className="scanner-heading">
        <div>
          <span className="scanner-live-dot" />
          LIVE STATION
        </div>
        <span>{stationId.replaceAll("-", " ").toUpperCase()}</span>
      </div>

      <div className="scanner-camera-shell">
        <div id={readerId} className="scanner-reader" />
        {!result && !cameraError && (
          <div className="scanner-overlay" aria-hidden="true">
            <div className="scanner-corners" />
          </div>
        )}

        {result && (
          <div className={`scanner-result ${result.status}`}>
            <div className="scanner-result-icon">
              {result.status === "granted" ? (
                <Check size={42} />
              ) : (
                <ShieldAlert size={42} />
              )}
            </div>
            <span>
              {result.status === "granted" ? "ACCESS GRANTED" : "INVALID PASS"}
            </span>
            <strong>
              {result.status === "granted" ? "Demo Attendee" : "QR not recognized"}
            </strong>
            <small>{result.code.slice(0, 38)}</small>
            <div className="scanner-reset-line">Returning to camera in 3 seconds</div>
          </div>
        )}

        {cameraError && (
          <div className="scanner-error-state">
            <ShieldAlert size={36} />
            <strong>Camera unavailable</strong>
            <p>{cameraError}</p>
            <small>
              Buka halaman ini melalui HTTPS dan izinkan akses kamera pada browser.
            </small>
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
    </div>
  );
}
