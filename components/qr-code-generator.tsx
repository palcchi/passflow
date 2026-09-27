"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Search, Sparkles } from "lucide-react";
import { checkQrCodeAvailability, generateQrBatch } from "@/app/admin/actions";

type Availability =
  | {
      ok: true;
      eventId: string;
      prefix: string;
      amount: number;
      mode: "auto" | "custom";
      requestedStart: number;
      requestedAvailable: boolean;
      start: number;
      end: number;
      firstCode: string;
      lastCode: string;
      usedCount: number;
    }
  | { ok: false; message: string };

type GenerateResult =
  | {
      ok: true;
      message: string;
      prefix: string;
      start: number;
      end: number;
      firstCode: string;
      lastCode: string;
    }
  | {
      ok: false;
      message: string;
      conflict?: boolean;
      firstCode?: string;
      lastCode?: string;
      start?: number;
      end?: number;
    };

export function QrCodeGenerator({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [prefix, setPrefix] = useState("WR");
  const [amount, setAmount] = useState("10");
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [startNumber, setStartNumber] = useState("1");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [checking, startChecking] = useTransition();
  const [generating, startGenerating] = useTransition();

  function normalizedPrefix(value: string) {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 16);
  }

  function payload() {
    return {
      eventId,
      prefix: normalizedPrefix(prefix) || "WR",
      amount: Math.min(Math.max(Number(amount) || 1, 1), 250),
      startNumber: mode === "custom" ? Math.max(Number(startNumber) || 1, 1) : null,
      mode,
    } as const;
  }

  function invalidatePreview() {
    setAvailability(null);
    setResult(null);
  }

  function check() {
    setResult(null);
    startChecking(async () => {
      const response = await checkQrCodeAvailability(payload());
      setAvailability(response);
    });
  }

  function generate() {
    startGenerating(async () => {
      const response = await generateQrBatch(payload());
      setResult(response);
      if (response.ok) {
        setAvailability(null);
        router.refresh();
      } else if ("firstCode" in response && response.firstCode) {
        setAvailability(null);
      }
    });
  }

  const preview =
    availability?.ok
      ? availability
      : null;

  return (
    <div className="qr-generator">
      <div className="qr-generator-grid">
        <label className="event-admin-field">
          <span>Prefix</span>
          <input
            className="event-admin-input qr-prefix-input"
            value={prefix}
            maxLength={16}
            onChange={(event) => {
              setPrefix(normalizedPrefix(event.target.value));
              invalidatePreview();
            }}
            placeholder="e.g. VIP"
          />
          <small>Letters, numbers, and hyphens only.</small>
        </label>

        <label className="event-admin-field">
          <span>Quantity</span>
          <input
            className="event-admin-input"
            type="number"
            min={1}
            max={250}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              invalidatePreview();
            }}
          />
          <small>Maximum 250 credentials per batch.</small>
        </label>

        <div className="event-admin-field">
          <span>Starting number</span>
          <div className="qr-mode-toggle">
            <button
              type="button"
              className={mode === "auto" ? "is-active" : ""}
              onClick={() => {
                setMode("auto");
                invalidatePreview();
              }}
            >
              Auto
            </button>
            <button
              type="button"
              className={mode === "custom" ? "is-active" : ""}
              onClick={() => {
                setMode("custom");
                invalidatePreview();
              }}
            >
              Custom
            </button>
          </div>
          <small>{mode === "auto" ? "Find the first available range automatically." : "Set the starting number manually."}</small>
        </div>

        {mode === "custom" && (
          <label className="event-admin-field">
            <span>Start number</span>
            <input
              className="event-admin-input"
              type="number"
              min={1}
              value={startNumber}
              onChange={(event) => {
                setStartNumber(event.target.value);
                invalidatePreview();
              }}
            />
            <small>For example, 100 generates PREFIX-0100.</small>
          </label>
        )}
      </div>

      <div className="qr-generator-actions">
        <button className="button button-ghost" type="button" onClick={check} disabled={checking || generating}>
          {checking ? <LoaderCircle className="animate-spin" size={15} /> : <Search size={15} />}
          Check availability
        </button>
        <button className="button button-dark" type="button" onClick={generate} disabled={checking || generating}>
          {generating ? <LoaderCircle className="animate-spin" size={15} /> : <Sparkles size={15} />}
          Generate QR
        </button>
      </div>

      {preview && (
        <div className={`qr-availability ${preview.requestedAvailable ? "is-available" : "is-suggestion"}`}>
          <span className="qr-availability-icon"><Check size={15} /></span>
          <div>
            <strong>
              {preview.requestedAvailable
                ? "Range available"
                : "The selected range conflicts; here is the next available option"}
            </strong>
            <p>{preview.firstCode} → {preview.lastCode}</p>
            <small>
              {preview.mode === "auto"
                ? `${preview.usedCount} codes with this prefix have already been created.`
                : preview.requestedAvailable
                  ? "This custom range is available."
                  : "Previously created codes, including revoked credentials, are never reused."}
            </small>
          </div>
        </div>
      )}

      {availability && !availability.ok && (
        <div className="qr-generator-message is-error">{availability.message}</div>
      )}

      {result && (
        <div className={`qr-generator-message ${result.ok ? "is-success" : "is-error"}`}>
          {result.message}
          {result.ok && <strong>{result.firstCode} → {result.lastCode}</strong>}
        </div>
      )}
    </div>
  );
}
