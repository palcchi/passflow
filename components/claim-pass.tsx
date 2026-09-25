"use client";

import { useState } from "react";
import { Check, QrCode, ScanLine } from "lucide-react";

type ClaimPassProps = {
  eventName: string;
};

export function ClaimPass({ eventName }: ClaimPassProps) {
  const [claimed, setClaimed] = useState(false);

  return (
    <div className="claim-card">
      <div className="claim-card-top">
        <span className="section-kicker">{eventName}</span>
        <span className={`claim-status ${claimed ? "claimed" : ""}`}>
          {claimed ? "Active" : "Not claimed"}
        </span>
      </div>

      <div className="claim-identity">
        <span>ATTENDEE</span>
        <h2>Vallian Tito Aprilio</h2>
        <p>VIP Pass · ATT-0248</p>
      </div>

      {claimed ? (
        <>
          <div className="digital-pass-qr">
            <QrCode size={132} strokeWidth={1.1} />
          </div>
          <div className="claim-success">
            <span className="success-icon">
              <Check size={17} />
            </span>
            <div>
              <strong>WR-0192 connected</strong>
              <small>QR ini sama dengan QR pada wristband.</small>
            </div>
          </div>
        </>
      ) : (
        <div className="claim-empty">
          <ScanLine size={42} />
          <strong>No wristband connected</strong>
          <p>
            Pada implementasi berikutnya tombol ini akan membuka kamera dan membaca QR wristband.
          </p>
          <button
            className="button button-primary full-button"
            type="button"
            onClick={() => setClaimed(true)}
          >
            <ScanLine size={17} />
            Demo claim wristband
          </button>
        </div>
      )}
    </div>
  );
}
