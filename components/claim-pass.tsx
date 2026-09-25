"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, RefreshCw, ScanLine, ShieldAlert } from "lucide-react";
import { claimWristband, replaceWristband } from "@/app/event-actions";
import { QrCodeImage } from "@/components/qr-code-image";

type ClaimPassProps = {
  eventSlug: string;
  eventName: string;
  attendee: {
    name: string;
    attendeeCode: string;
    ticketName: string;
  };
  credential: {
    code: string;
    displayCode: string | null;
  } | null;
};

type Result = {
  ok?: boolean;
  reason?: string;
  code?: string;
  display_code?: string;
};

const errors: Record<string, string> = {
  invalid_code: "QR wristband tidak dikenali.",
  already_claimed: "Wristband ini sudah diklaim akun lain.",
  already_active: "Akunmu sudah memiliki wristband aktif.",
  not_registered: "Kamu belum terdaftar pada event ini.",
  database: "Server belum dapat memproses claim. Coba lagi.",
};

export function ClaimPass({ eventSlug, eventName, attendee, credential }: ClaimPassProps) {
  const readerId = "passflow-claim-reader";
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [current, setCurrent] = useState(credential);
  const [scanning, setScanning] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!scanning) return;
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            stopScanner();
            submitCode(decodedText);
          },
          () => undefined,
        );
      } catch (error) {
        if (!mounted) return;
        setCameraError(error instanceof Error ? error.message : "Camera unavailable");
      }
    }

    start();
    return () => {
      mounted = false;
      stopScanner();
    };
  }, [scanning]);

  function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) scanner.stop().catch(() => undefined);
    setScanning(false);
  }

  function submitCode(code: string) {
    if (!code.trim() || isPending) return;
    setMessage(null);
    startTransition(async () => {
      const result = (replaceMode
        ? await replaceWristband(eventSlug, code)
        : await claimWristband(eventSlug, code)) as Result;

      if (result.ok && result.code) {
        setCurrent({
          code: result.code,
          displayCode: result.display_code ?? null,
        });
        setReplaceMode(false);
        setMessage(replaceMode ? "Wristband berhasil diganti." : "Wristband berhasil dihubungkan.");
      } else {
        setMessage(errors[result.reason ?? ""] ?? "Claim belum berhasil.");
      }
    });
  }

  if (current && !replaceMode) {
    return (
      <div className="claim-card">
        <div className="claim-card-top">
          <span className="section-kicker">{eventName}</span>
          <span className="claim-status claimed">Active</span>
        </div>
        <div className="claim-identity">
          <span>ATTENDEE</span>
          <h2>{attendee.name}</h2>
          <p>{attendee.ticketName} · {attendee.attendeeCode}</p>
        </div>
        <div className="digital-pass-qr">
          <QrCodeImage value={`PF1:${current.code}`} size={180} />
        </div>
        <div className="claim-success">
          <span className="success-icon"><Check size={17} /></span>
          <div>
            <strong>{current.displayCode ?? "Active wristband"} connected</strong>
            <small>QR ini sama persis dengan credential pada wristband fisik.</small>
          </div>
        </div>
        <button className="button button-ghost full-button mt-4" type="button" onClick={() => setReplaceMode(true)}>
          <RefreshCw size={17} /> Replace lost wristband
        </button>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>
    );
  }

  return (
    <div className="claim-card">
      <div className="claim-card-top">
        <span className="section-kicker">{eventName}</span>
        <span className="claim-status">{replaceMode ? "Replacement" : "Not claimed"}</span>
      </div>
      <div className="claim-identity">
        <span>ATTENDEE</span>
        <h2>{attendee.name}</h2>
        <p>{attendee.ticketName} · {attendee.attendeeCode}</p>
      </div>

      <div className="claim-empty">
        <ScanLine size={42} />
        <strong>{replaceMode ? "Scan replacement wristband" : "Scan your wristband"}</strong>
        <p>Gunakan kamera atau masukkan kode credential secara manual jika kamera tidak tersedia.</p>

        {scanning ? (
          <div className="w-full">
            <div id={readerId} className="scanner-reader rounded-md overflow-hidden" />
            <button className="button button-ghost full-button mt-3" type="button" onClick={stopScanner}>Cancel camera</button>
          </div>
        ) : (
          <button className="button button-primary full-button" type="button" onClick={() => { setCameraError(null); setScanning(true); }}>
            <ScanLine size={17} /> Open camera
          </button>
        )}

        <div className="mt-4 flex w-full gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="PF1:... atau token"
          />
          <button className="button button-dark" type="button" disabled={isPending} onClick={() => submitCode(manualCode)}>
            {isPending ? "..." : "Claim"}
          </button>
        </div>

        {replaceMode && (
          <button className="button button-ghost full-button" type="button" onClick={() => setReplaceMode(false)}>
            Keep current wristband
          </button>
        )}

        {cameraError && (
          <p className="mt-3 flex gap-2 text-sm text-destructive"><ShieldAlert size={16} /> {cameraError}</p>
        )}
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
