"use server";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { normalizeInternationalPhone } from "@/lib/auth/phone";
import { getPostgresPool } from "@/lib/db/postgres";
import { sendWhatsAppOtp } from "@/lib/whatsapp/zapo";

const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

function hashOtp(userId: string, phone: string, code: string) {
  const secret = process.env.PHONE_OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("phone_otp_secret_not_configured");
  return createHmac("sha256", secret).update(userId + ":" + phone + ":" + code).digest("hex");
}

function compareHash(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function issueOtp(userId: string, phone: string, next: string): Promise<never> {
  if (process.env.WHATSAPP_OTP_ENABLED !== "true") redirect("/phone?error=disabled&next=" + encodeURIComponent(next));
  const pool = getPostgresPool();
  const db = await pool.connect();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  let challengeId = "";
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    const limits = await db.query<{ sends: number; last_sent_at: Date | null }>(
      "SELECT count(*)::int AS sends, max(created_at) AS last_sent_at FROM public.phone_otp_challenges WHERE (user_id = $1 OR phone = $2) AND created_at > now() - interval '1 hour'",
      [userId, phone],
    );
    const sends = limits.rows[0]?.sends ?? 0;
    const lastSent = limits.rows[0]?.last_sent_at;
    if (sends >= MAX_SENDS_PER_HOUR) {
      await db.query("ROLLBACK");
      redirect("/phone?error=rate&next=" + encodeURIComponent(next));
    }
    if (lastSent && Date.now() - new Date(lastSent).getTime() < RESEND_SECONDS * 1000) {
      await db.query("ROLLBACK");
      redirect("/phone?error=wait&next=" + encodeURIComponent(next));
    }
    await db.query("UPDATE public.phone_otp_challenges SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL", [userId]);
    const inserted = await db.query<{ id: string }>(
      "INSERT INTO public.phone_otp_challenges (user_id, phone, code_hash, expires_at, attempts, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', 0, now()) RETURNING id",
      [userId, phone, hashOtp(userId, phone, code)],
    );
    challengeId = inserted.rows[0].id;
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/phone?error=setup&next=" + encodeURIComponent(next));
  } finally {
    db.release();
  }
  const sent = await sendWhatsAppOtp(phone, code);
  if (!sent.ok) {
    await pool.query("UPDATE public.phone_otp_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL", [challengeId]).catch(() => undefined);
    redirect("/phone?error=delivery&next=" + encodeURIComponent(next));
  }
  redirect("/phone?step=verify&sent=1&next=" + encodeURIComponent(next));
}

export async function sendRequiredPhoneOtp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const phone = normalizeInternationalPhone(formData.get("phone"));
  if (!phone) redirect("/phone?error=invalid&next=" + encodeURIComponent(next));
  const context = await requireUser("/phone?next=" + encodeURIComponent(next));
  await issueOtp(context.user.id, phone, next);
}

export async function resendRequiredPhoneOtp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const context = await requireUser("/phone?step=verify&next=" + encodeURIComponent(next));
  const result = await getPostgresPool().query<{ phone: string }>(
    "SELECT phone FROM public.phone_otp_challenges WHERE user_id = $1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [context.user.id],
  );
  const phone = result.rows[0]?.phone;
  if (!phone) redirect("/phone?error=missing&next=" + encodeURIComponent(next));
  await issueOtp(context.user.id, phone, next);
}

export async function verifyRequiredPhoneOtp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) redirect("/phone?step=verify&error=code&next=" + encodeURIComponent(next));
  const context = await requireUser("/phone?step=verify&next=" + encodeURIComponent(next));
  const pool = getPostgresPool();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [context.user.id]);
    const result = await db.query<{ id: string; phone: string; code_hash: string; expires_at: Date; attempts: number }>(
      "SELECT id, phone, code_hash, expires_at, attempts FROM public.phone_otp_challenges WHERE user_id = $1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [context.user.id],
    );
    const challenge = result.rows[0];
    if (!challenge) {
      await db.query("ROLLBACK");
      redirect("/phone?error=missing&next=" + encodeURIComponent(next));
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await db.query("UPDATE public.phone_otp_challenges SET consumed_at = now() WHERE id = $1", [challenge.id]);
      await db.query("COMMIT");
      redirect("/phone?error=attempts&next=" + encodeURIComponent(next));
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await db.query("UPDATE public.phone_otp_challenges SET consumed_at = now() WHERE id = $1", [challenge.id]);
      await db.query("COMMIT");
      redirect("/phone?error=expired&next=" + encodeURIComponent(next));
    }
    if (!compareHash(challenge.code_hash, hashOtp(context.user.id, challenge.phone, code))) {
      await db.query("UPDATE public.phone_otp_challenges SET attempts = attempts + 1 WHERE id = $1", [challenge.id]);
      await db.query("COMMIT");
      redirect("/phone?step=verify&error=wrong&next=" + encodeURIComponent(next));
    }
    await db.query(
      "UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', $2::text, 'phone_verified', true), updated_at = now() WHERE id = $1",
      [context.user.id, challenge.phone],
    );
    await db.query("UPDATE public.phone_otp_challenges SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL", [context.user.id]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/phone?step=verify&error=setup&next=" + encodeURIComponent(next));
  } finally {
    db.release();
  }
  revalidatePath("/account");
  revalidatePath("/profile");
  redirect(next);
}
