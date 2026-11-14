import "server-only";
import QRCode from "qrcode";

const SITE = (process.env.NEXT_PUBLIC_APP_URL || "https://passflow.my.id").replace(/\/$/, "");
type ZapoResult = { ok: boolean; reason?: string };

function configured() {
  return Boolean(process.env.ZAPO_BASE_URL && process.env.ZAPO_API_KEY);
}

async function postZapo(path: string, body: Record<string, unknown>): Promise<ZapoResult> {
  if (!configured()) return { ok: false, reason: "not_configured" };
  try {
    const response = await fetch(new URL(path, process.env.ZAPO_BASE_URL), {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.ZAPO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { ok: false, reason: "gateway_http_" + response.status };
    const result = await response.json() as { ok?: boolean };
    return { ok: result.ok === true };
  } catch {
    return { ok: false, reason: "gateway_unavailable" };
  }
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[\s()+.-]/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export async function sendTicketQrWhatsApp(input: {
  phone: string;
  eventName: string;
  eventSlug: string;
  credentialCode?: string | null;
  passUrl?: string;
}): Promise<ZapoResult> {
  if (process.env.WHATSAPP_TICKET_DELIVERY_ENABLED !== "true") return { ok: false, reason: "delivery_disabled" };
  const to = normalizePhone(input.phone);
  if (!to) return { ok: false, reason: "invalid_phone" };
  const passUrl = input.passUrl || SITE + "/e/" + encodeURIComponent(input.eventSlug) + "/claim";
  const eventName = input.eventName.replace(/[\r\n]+/g, " ").slice(0, 140);
  if (!input.credentialCode) {
    return postZapo("/send/text", {
      to,
      text: "*Your ticket is ready* 🎟️\n\nHi there! 👋\nYour registration for *" + eventName + "* has been approved.\n\nOpen your pass and check-in details here:\n" + passUrl + "\n\n_Keep your ticket private. See you there!_",
    });
  }

  try {
    const dataUrl = await QRCode.toDataURL("PF1:" + input.credentialCode, { width: 600, margin: 4, errorCorrectionLevel: "M" });
    const base64 = dataUrl.split(",", 2)[1];
    if (!base64) return { ok: false, reason: "qr_generation_failed" };
    return postZapo("/send/image", {
      to,
      mime: "image/png",
      base64,
      caption: "*Your event pass* 🎟️\n" + eventName + "\n\nShow this QR at check-in.\n_Keep it private._",
    });
  } catch {
    return { ok: false, reason: "qr_generation_failed" };
  }
}

export async function sendWhatsAppNotification(phone: string, text: string): Promise<ZapoResult> {
  const to = normalizePhone(phone);
  const message = text.replace(/\r?\n/g, "\n").trim().slice(0, 3000);
  if (!to || !message) return { ok: false, reason: "invalid_input" };
  return postZapo("/send/text", { to, text: message });
}

export async function sendWhatsAppOtp(phone: string, code: string): Promise<ZapoResult> {
  if (process.env.WHATSAPP_OTP_ENABLED !== "true") return { ok: false, reason: "otp_disabled" };
  const to = normalizePhone(phone);
  if (!to || !/^\d{6}$/.test(code)) return { ok: false, reason: "invalid_input" };
  return postZapo("/send/text", {
    to,
    text: "*Verify your number* 🔐\n\nYour verification code is *" + code + "*.\n\nExpires in *10 minutes* and can only be used once.\n_Never share this code with anyone._",
  });
}
