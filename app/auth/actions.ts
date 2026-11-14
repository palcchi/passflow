"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerAuthClient } from "@/lib/supabase/server";
import { signInWithLocalPassword } from "@/lib/auth/local-password";
import { revokeLocalSession } from "@/lib/auth/local-session";
import { hashNewPassword } from "@/lib/auth/password";
import { issueEmailVerificationToken, issuePasswordResetToken } from "@/lib/auth/local-tokens";
import { getPostgresPool, postgresQuery } from "@/lib/db/postgres";
import { isLocalMailConfigured, sendLocalMail } from "@/lib/auth/local-mail";
import { emailHtml } from "@/lib/email";
import { normalizeInternationalPhone } from "@/lib/auth/phone";
import { sendWhatsAppOtp } from "@/lib/whatsapp/zapo";
function authRedirect(path: string, key: string) { return `/login?${key}=1&next=${encodeURIComponent(path)}`; }
function isStrongPassword(password: string) { return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password); }

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  if (process.env.PASSFLOW_LOCAL_GOOGLE_OAUTH !== "true") {
    const origin = getAppOrigin();
    if (!origin || !getSupabaseConfig()) redirect(authRedirect(next, "unavailable"));
    let providerUrl: string | null = null;
    try {
      const callback = new URL("/auth/callback", origin);
      callback.searchParams.set("next", next);
      const supabase = await createServerAuthClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (!error) providerUrl = data.url;
    } catch {}
    if (!providerUrl) redirect(authRedirect(next, "provider"));
    redirect(providerUrl);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!origin || !clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    redirect(authRedirect(next, "unavailable"));
  }

  const state = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.delete("passflow_google_state");
  jar.delete("passflow_google_next");
  jar.set("passflow_google_state", state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", domain: process.env.NODE_ENV === "production" ? ".passflow.my.id" : undefined, maxAge: 600,
  });
  jar.set("passflow_google_next", next, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", domain: process.env.NODE_ENV === "production" ? ".passflow.my.id" : undefined, maxAge: 600,
  });

  const callback = new URL("/auth/google/callback", origin).toString();
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  redirect(authorize.toString());
}

export async function signInWithEmail(formData: FormData) {
  const next=safeNext(formData.get("next")); const email=String(formData.get("email")??"").trim().toLowerCase(); const password=String(formData.get("password")??"");
  if(!email||password.length<8) redirect(authRedirect(next,"invalid"));
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    try {
      const result = await signInWithLocalPassword(email, password);
      if (result.ok) redirect(next);
      if (result.reason === "unverified") redirect(authRedirect(next, "unverified"));
    } catch {}
    redirect(authRedirect(next, "invalid"));
  }
  let success = false;
  let errorCode = "invalid";
  try {
    const supabase=await createServerAuthClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    success = !error;
    if (error?.code === "email_not_confirmed") errorCode = "unverified";
  } catch {}
  if (success) redirect(next);
  if (errorCode === "unverified") redirect(authRedirect(next,"unverified"));
  redirect(authRedirect(next,"invalid"));
}
function pendingSignupCodeHash(challengeId: string, phone: string, code: string) {
  const secret = process.env.PHONE_OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("phone_otp_secret_not_configured");
  return createHmac("sha256", secret).update(challengeId + ":" + phone + ":" + code).digest("hex");
}

function safeHashEqual(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signUpWithEmail(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const origin = getAppOrigin();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const phone = normalizeInternationalPhone(formData.get("phone"));
  if (!origin || !email || email.length > 320 || !phone || !isStrongPassword(password) || !/^[a-z0-9_]{3,24}$/.test(username)) {
    redirect(`/register?error=invalid&next=${encodeURIComponent(next)}`);
  }

  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    if (process.env.WHATSAPP_OTP_ENABLED !== "true" || !isLocalMailConfigured()) {
      redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
    }
    let challengeId = "";
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const pool = getPostgresPool();
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
      const existing = await db.query<{ id: string }>(
        "SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1", [email],
      );
      if (existing.rows[0]) {
        await db.query("ROLLBACK");
        redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
      }
      const limits = await db.query<{ sends: number; last_sent_at: Date | null }>(
        `SELECT count(*)::int AS sends, max(created_at) AS last_sent_at
         FROM auth.pending_signups WHERE (lower(email) = $1 OR phone = $2)
           AND created_at > now() - interval '1 hour'`, [email, phone],
      );
      const sends = limits.rows[0]?.sends ?? 0;
      const lastSent = limits.rows[0]?.last_sent_at;
      if (sends >= 5 || (lastSent && Date.now() - new Date(lastSent).getTime() < 60_000)) {
        await db.query("ROLLBACK");
        redirect(`/register?error=rate&next=${encodeURIComponent(next)}`);
      }
      await db.query(
        "UPDATE auth.pending_signups SET consumed_at = now() WHERE (lower(email) = $1 OR phone = $2) AND consumed_at IS NULL",
        [email, phone],
      );
      const passwordHash = await hashNewPassword(password);
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO auth.pending_signups
          (email, username, phone, encrypted_password, code_hash, expires_at)
         VALUES ($1, $2, $3, $4, 'pending', now() + interval '10 minutes') RETURNING id`,
        [email, username, phone, passwordHash],
      );
      challengeId = inserted.rows[0].id;
      await db.query("UPDATE auth.pending_signups SET code_hash = $2 WHERE id = $1", [challengeId, pendingSignupCodeHash(challengeId, phone, code)]);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => undefined);
      if (error && typeof error === "object" && "digest" in error) throw error;
      redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
    } finally {
      db.release();
    }
    const sent = await sendWhatsAppOtp(phone, code);
    if (!sent.ok) {
      await pool.query("UPDATE auth.pending_signups SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL", [challengeId]).catch(() => undefined);
      redirect(`/register?error=delivery&next=${encodeURIComponent(next)}`);
    }
    redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&next=${encodeURIComponent(next)}`);
  }

  // Supabase Auth owns confirmation when local authentication is disabled.
  if (!getSupabaseConfig()) redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
  let success = false;
  try {
    const supabase = await createServerAuthClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: origin, data: { username, phone, phone_verified: false } } });
    success = !error;
  } catch {}
  if (success) redirect(`/register?notice=check-email&next=${encodeURIComponent(next)}`);
  redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
}

export async function resendPendingSignupPhoneOtp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const challengeId = String(formData.get("challenge") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || process.env.PASSFLOW_LOCAL_AUTH !== "true" || process.env.WHATSAPP_OTP_ENABLED !== "true") {
    redirect(`/register?error=expired&next=${encodeURIComponent(next)}`);
  }
  const pool = getPostgresPool();
  const db = await pool.connect();
  let phone = "";
  let code = "";
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [challengeId]);
    const result = await db.query<{ phone: string; send_count: number; last_sent_at: Date; consumed_at: Date | null }>(
      "SELECT phone, send_count, last_sent_at, consumed_at FROM auth.pending_signups WHERE id = $1 FOR UPDATE", [challengeId],
    );
    const pending = result.rows[0];
    if (!pending || pending.consumed_at) {
      await db.query("ROLLBACK");
      redirect(`/register?error=expired&next=${encodeURIComponent(next)}`);
    }
    if (pending.send_count >= 5 || Date.now() - new Date(pending.last_sent_at).getTime() < 60_000) {
      await db.query("ROLLBACK");
      redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&error=rate&next=${encodeURIComponent(next)}`);
    }
    phone = pending.phone;
    code = String(randomInt(0, 1000000)).padStart(6, "0");
    await db.query(
      "UPDATE auth.pending_signups SET code_hash = $2, attempts = 0, send_count = send_count + 1, last_sent_at = now(), expires_at = now() + interval '10 minutes' WHERE id = $1",
      [challengeId, pendingSignupCodeHash(challengeId, phone, code)],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&error=provider&next=${encodeURIComponent(next)}`);
  } finally {
    db.release();
  }
  const sent = await sendWhatsAppOtp(phone, code);
  if (!sent.ok) {
    await pool.query("UPDATE auth.pending_signups SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL", [challengeId]).catch(() => undefined);
    redirect(`/register?error=delivery&next=${encodeURIComponent(next)}`);
  }
  redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&sent=1&next=${encodeURIComponent(next)}`);
}

export async function verifyPendingSignupPhone(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const challengeId = String(formData.get("challenge") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
    redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&error=code&next=${encodeURIComponent(next)}`);
  }
  if (process.env.PASSFLOW_LOCAL_AUTH !== "true") redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
  const pool = getPostgresPool();
  const db = await pool.connect();
  let userId = "";
  let email = "";
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [challengeId]);
    const found = await db.query<{ id: string; email: string; username: string; phone: string; encrypted_password: string; code_hash: string; attempts: number; expires_at: Date }>(
      `SELECT id, email, username, phone, encrypted_password, code_hash, attempts, expires_at
       FROM auth.pending_signups WHERE id = $1 AND consumed_at IS NULL FOR UPDATE`, [challengeId],
    );
    const pending = found.rows[0];
    if (!pending) {
      await db.query("ROLLBACK");
      redirect(`/register?error=expired&next=${encodeURIComponent(next)}`);
    }
    if (pending.attempts >= 5 || new Date(pending.expires_at).getTime() <= Date.now()) {
      await db.query("UPDATE auth.pending_signups SET consumed_at = now() WHERE id = $1", [challengeId]);
      await db.query("COMMIT");
      redirect(`/register?error=expired&next=${encodeURIComponent(next)}`);
    }
    if (!safeHashEqual(pending.code_hash, pendingSignupCodeHash(challengeId, pending.phone, code))) {
      await db.query("UPDATE auth.pending_signups SET attempts = attempts + 1 WHERE id = $1", [challengeId]);
      await db.query("COMMIT");
      redirect(`/register?step=verify-phone&challenge=${encodeURIComponent(challengeId)}&error=wrong&next=${encodeURIComponent(next)}`);
    }
    const existing = await db.query<{ id: string }>("SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1", [pending.email]);
    if (existing.rows[0]) {
      await db.query("UPDATE auth.pending_signups SET consumed_at = now() WHERE id = $1", [challengeId]);
      await db.query("COMMIT");
      redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
    }
    const created = await db.query<{ id: string }>(
      `INSERT INTO auth.users (email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
       VALUES ($1, $2, $3::jsonb, $4::jsonb) RETURNING id`,
      [pending.email, pending.encrypted_password, JSON.stringify({ provider: "email", providers: ["email"] }), JSON.stringify({ username: pending.username, phone: pending.phone, phone_verified: true })],
    );
    userId = created.rows[0].id;
    email = pending.email;
    await db.query("UPDATE auth.pending_signups SET consumed_at = now() WHERE id = $1", [challengeId]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
  } finally {
    db.release();
  }

  try {
    const token = await issueEmailVerificationToken(userId);
    const origin = getAppOrigin();
    if (!origin) throw new Error("app_origin_missing");
    const link = new URL("/auth/confirm", origin);
    link.searchParams.set("token_hash", token);
    link.searchParams.set("type", "signup");
    link.searchParams.set("next", next);
    await sendLocalMail({
      to: email,
      subject: "Verify your Passflow account",
      text: `Your WhatsApp number is verified. Confirm your PassFlow email address to activate your account: ${link.toString()}`,
      html: emailHtml({ kicker: "Account verification", title: "One more step: verify your email.", body: "Your WhatsApp number is verified. Confirm your email address to activate your PassFlow account. This link expires in 24 hours.", action: "Verify email address", href: link.toString() }),
    });
  } catch {
    redirect(`/login?notice=mail-pending&next=${encodeURIComponent(next)}`);
  }
  redirect(`/login?notice=check-email&next=${encodeURIComponent(next)}`);
}

export async function resendSignupConfirmation(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const origin = getAppOrigin();
  if (!email || !origin) redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);

  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    if (!isLocalMailConfigured()) redirect(`/login?notice=mail-pending&next=${encodeURIComponent(next)}`);
    try {
      const result = await postgresQuery<{ id: string; email_confirmed_at: Date | null }>(
        "SELECT id, email_confirmed_at FROM auth.users WHERE lower(email) = $1 LIMIT 1", [email],
      );
      const user = result.rows[0];
      if (user && !user.email_confirmed_at) {
        const token = await issueEmailVerificationToken(user.id);
        const link = new URL("/auth/confirm", origin);
        link.searchParams.set("token_hash", token);
        link.searchParams.set("type", "signup");
        link.searchParams.set("next", next);
        await sendLocalMail({
          to: email, subject: "Verify your Passflow account",
          text: `Confirm your Passflow account: ${link.toString()}`,
          html: emailHtml({ kicker: "Account verification", title: "Verify your email address.", body: "Use the button below to confirm your PassFlow email address. This link expires in 24 hours.", action: "Verify email address", href: link.toString() }),
        });
      }
    } catch {}
    redirect(`/login?notice=verification-sent&next=${encodeURIComponent(next)}`);
  }

  if (!getSupabaseConfig()) redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
  let success = false;
  try {
    const supabase = await createServerAuthClient();
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: origin } });
    success = !error;
  } catch {}
  if (success) redirect(`/login?notice=verification-sent&next=${encodeURIComponent(next)}`);
  redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const origin = getAppOrigin();
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    if (email && origin && isLocalMailConfigured()) {
      try {
        const result = await postgresQuery<{ id: string }>(
          "SELECT id FROM auth.users WHERE lower(email) = $1 AND email_confirmed_at IS NOT NULL LIMIT 1", [email],
        );
        const user = result.rows[0];
        if (user) {
          const token = await issuePasswordResetToken(user.id);
          const link = new URL("/auth/reset", origin);
          link.searchParams.set("token", token);
          await sendLocalMail({
            to: email, subject: "Reset your Passflow password",
            text: `Reset your Passflow password: ${link.toString()}`,
            html: emailHtml({ kicker: "Password reset", title: "Choose a new password.", body: "We received a request to reset your PassFlow password. If you made this request, use the button below. This link expires in one hour. If you did not request a reset, you can safely ignore this email.", action: "Reset password", href: link.toString() }),
          });
        }
      } catch {}
    }
    redirect(isLocalMailConfigured() ? "/login?notice=reset-sent" : "/login?notice=mail-pending");
  }
  if (origin && getSupabaseConfig() && email) {
    try {
      const supabase = await createServerAuthClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
    } catch {}
  }
  redirect("/login?notice=reset-sent");
}
export async function signOut(){
  try {
    const localSession = await import("@/lib/auth/local-session").then((m) => m.getLocalSession());
    if (localSession) {
      await revokeLocalSession();
      revalidatePath("/", "layout");
      redirect("/login?notice=signed-out");
    }
  } catch {}
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    try { await revokeLocalSession(); } catch { redirect("/login?error=signout"); }
    revalidatePath("/", "layout");
    redirect("/login?notice=signed-out");
  }
  let failed=false;if(getSupabaseConfig()){try{const supabase=await createServerAuthClient();const {error}=await supabase.auth.signOut({scope:"local"});failed=!!error;}catch{failed=true;}}if(failed)redirect("/login?error=signout");revalidatePath("/","layout");redirect("/login?notice=signed-out");
}
