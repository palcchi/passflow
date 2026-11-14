import "server-only";
import { SignJWT } from "jose";
import { getLocalSession } from "@/lib/auth/local-session";

function getSigningKey(): Uint8Array {
  const secret = process.env.PASSFLOW_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("local_jwt_not_configured");
  return new TextEncoder().encode(secret);
}

/** Short-lived PostgREST JWT derived only from a validated local session. */
export async function getLocalAccessToken(userId?: string): Promise<string | null> {
  // Prefer the identity already validated by getAuthContext. Re-reading cookies
  // from inside the Supabase SDK token callback can lose request context and
  // silently fall back to the anonymous PostgREST role.
  const session = userId ? null : await getLocalSession();
  const subject = userId ?? session?.user.id;
  if (!subject) return null;

  return new SignJWT({
    role: "authenticated",
    aud: "authenticated",
    iss: "passflow-selfhost",
    email: session?.user.email ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSigningKey());
}
