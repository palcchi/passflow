import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import type { Database } from "@/lib/supabase/database.types";

// Server-only privileged client. Callers must authorize the request before using it.
export function serviceClient() {
  if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
    const rawUrl = process.env.PASSFLOW_POSTGREST_URL;
    const key = process.env.PASSFLOW_POSTGREST_ANON_KEY;
    const secret = process.env.PASSFLOW_JWT_SECRET;
    if (!rawUrl || !key || !secret || secret.length < 32) throw new Error("local_service_not_configured");
    const origin = new URL(rawUrl).origin;
    const localFetch: typeof fetch = async (input, init) => {
      const originalUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(originalUrl);
      if (url.origin === origin) url.pathname = url.pathname.replace(/^\/rest\/v1(?=\/|$)/, "") || "/";
      const request = input instanceof Request ? new Request(url, input) : url.toString();
      return fetch(request, init);
    };
    return createClient<Database>(origin, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      accessToken: async () => new SignJWT({ role: "service_role", aud: "authenticated", iss: "passflow-selfhost" })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("2m")
        .sign(new TextEncoder().encode(secret)),
      global: { fetch: localFetch },
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("service_not_configured");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
