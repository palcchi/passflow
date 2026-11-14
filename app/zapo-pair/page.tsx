import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pair Passflow WhatsApp",
  robots: { index: false, follow: false },
};

function tokenMatches(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function ZapoPairPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const expected = process.env.ZAPO_PAIRING_VIEW_TOKEN ?? "";
  if (!expected || !tokenMatches(token, expected)) notFound();

  const baseUrl = process.env.ZAPO_BASE_URL ?? "http://127.0.0.1:2786";
  const apiKey = process.env.ZAPO_API_KEY ?? "";
  let qrDataUrl: string | null = null;
  let statusText = "Menunggu QR pairing dari Zapo…";
  let refreshSeconds = 4;

  try {
    const statusResponse = await fetch(new URL("/status", baseUrl), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (statusResponse.ok) {
      const status = await statusResponse.json() as { paired?: boolean; connected?: boolean; state?: string; qrAvailable?: boolean };
      if (status.paired && status.connected) {
        statusText = "WhatsApp Passflow sudah terhubung.";
        refreshSeconds = 10;
      } else if (status.paired) {
        statusText = "Nomor sudah dipasangkan; Zapo sedang menyambungkan kembali.";
        refreshSeconds = 5;
      } else if (status.qrAvailable) {
        const qrResponse = await fetch(new URL("/pairing", baseUrl), {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (qrResponse.ok) {
          const pairing = await qrResponse.json() as { qr?: string };
          if (pairing.qr) {
            qrDataUrl = await QRCode.toDataURL(pairing.qr, { width: 440, margin: 2, errorCorrectionLevel: "M" });
            statusText = "Buka WhatsApp di ponsel Passflow, lalu pindai QR ini.";
            refreshSeconds = 8;
          }
        }
      }
    }
  } catch {
    statusText = "Layanan Zapo belum dapat dijangkau. Halaman akan mencoba lagi otomatis.";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f5f5", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <meta httpEquiv="refresh" content={String(refreshSeconds)} />
      <section style={{ width: "100%", maxWidth: 520, padding: 28, borderRadius: 20, background: "#fff", boxShadow: "0 10px 35px rgba(0,0,0,.08)", textAlign: "center" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>PASSFLOW · WHATSAPP</p>
        <h1 style={{ fontSize: 26, margin: "0 0 12px" }}>Hubungkan nomor Passflow</h1>
        {qrDataUrl ? (
          <Image src={qrDataUrl} alt="QR pairing WhatsApp Passflow" width={440} height={440} unoptimized style={{ width: "min(100%, 440px)", height: "auto", display: "block", margin: "12px auto" }} />
        ) : (
          <div style={{ minHeight: 180, display: "grid", placeItems: "center", color: "#555" }}>
            <p>{statusText}</p>
          </div>
        )}
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>{statusText}</p>
        {qrDataUrl ? <p style={{ color: "#666", fontSize: 13 }}>QR diperbarui otomatis setiap sekitar 35 detik. Buka WhatsApp → Perangkat tertaut → Tautkan perangkat.</p> : null}
        <p style={{ color: "#777", fontSize: 12, marginTop: 22 }}>Jangan bagikan halaman ini. QR hanya untuk memasangkan perangkat Passflow.</p>
      </section>
    </main>
  );
}
