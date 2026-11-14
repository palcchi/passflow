import { createRemoteJWKSet, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/db/postgres";
import { createLocalSession } from "@/lib/auth/local-session";
import { safeNext } from "@/lib/auth/redirect";
import { isValidE164Phone } from "@/lib/auth/phone";

export const runtime = "nodejs";
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function fail(request: NextRequest, code: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(code), origin));
}

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!origin || !clientId || !clientSecret) return fail(request, "unavailable");

  const jar = request.cookies;
  const expectedState = jar.get("passflow_google_state")?.value || "";
  const receivedState = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");
  const clearCookies = (response: NextResponse) => {
    for (const name of ["passflow_google_state", "passflow_google_next"]) {
      response.cookies.delete(name);
      if (process.env.NODE_ENV === "production") {
        response.cookies.set(name, "", { domain: ".passflow.my.id", path: "/", maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" });
      }
    }
    return response;
  };
  if (providerError) return clearCookies(fail(request, "google_cancelled"));
  if (!code || !expectedState || !receivedState) return clearCookies(fail(request, "oauth_state"));
  const left = Buffer.from(expectedState);
  const right = Buffer.from(receivedState);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return clearCookies(fail(request, "oauth_state"));

  try {
    const redirectUri = new URL("/auth/google/callback", origin).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return clearCookies(fail(request, "google_token"));
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return clearCookies(fail(request, "google_token"));

    const verified = await jwtVerify(tokens.id_token, googleKeys, {
      audience: clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const claims = verified.payload;
    const subject = typeof claims.sub === "string" ? claims.sub : "";
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";
    if (!subject || !email || !emailVerified) return clearCookies(fail(request, "google_email_unverified"));

    const fullName = typeof claims.name === "string" ? claims.name : "";
    const picture = typeof claims.picture === "string" ? claims.picture : null;
    const usernameBase = (email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 18);
    const username = usernameBase.length >= 3 ? usernameBase : "user_" + usernameBase;
    const pool = getPostgresPool();
    const db = await pool.connect();
    let userId = "";
    let accountPhone = "";
    let accountPhoneVerified = false;
    try {
      await db.query("BEGIN");
      const linked = await db.query<{ user_id: string }>(
        "SELECT user_id FROM auth.identities WHERE provider = 'google' AND provider_subject = $1 LIMIT 1",
        [subject],
      );
      if (linked.rows[0]) {
        userId = linked.rows[0].user_id;
      } else {
        const existing = await db.query<{ id: string }>(
          "SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1",
          [email],
        );
        if (existing.rows[0]) {
          await db.query("ROLLBACK");
          return clearCookies(fail(request, "account_link_required"));
        }
        const metadata = {
          sub: subject, email, email_verified: true, name: fullName,
          full_name: fullName, avatar_url: picture, picture, username,
        };
        const inserted = await db.query<{ id: string }>(
          `INSERT INTO auth.users
            (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, last_sign_in_at)
           VALUES ($1, NULL, now(), $2::jsonb, $3::jsonb, now())
           RETURNING id`,
          [email, JSON.stringify({ provider: "google", providers: ["google"] }), JSON.stringify(metadata)],
        );
        userId = inserted.rows[0].id;
        await db.query(
          `INSERT INTO auth.identities (user_id, provider, provider_subject, provider_email)
           VALUES ($1, 'google', $2, $3)`,
          [userId, subject, email],
        );
      }
      await db.query("UPDATE auth.users SET last_sign_in_at = now(), updated_at = now() WHERE id = $1", [userId]);
      const profile = await db.query<{ phone: string | null; phone_verified: boolean | null }>(
        "SELECT raw_user_meta_data->>'phone' AS phone, (raw_user_meta_data->>'phone_verified')::boolean AS phone_verified FROM auth.users WHERE id = $1",
        [userId],
      );
      accountPhone = profile.rows[0]?.phone?.trim() ?? "";
      accountPhoneVerified = profile.rows[0]?.phone_verified === true;
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      db.release();
    }

    await createLocalSession(userId);
    const next = safeNext(jar.get("passflow_google_next")?.value);
    const destination = isValidE164Phone(accountPhone) && accountPhoneVerified
      ? next
      : "/phone?next=" + encodeURIComponent(next);
    return clearCookies(NextResponse.redirect(new URL(destination, origin)));
  } catch {
    return clearCookies(fail(request, "google_callback"));
  }
}
