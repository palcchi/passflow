import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getLocalAccessToken } from "@/lib/auth/local-jwt";

function getLocalApiConfig() {
  const url = process.env.PASSFLOW_POSTGREST_URL;
  const key = process.env.PASSFLOW_POSTGREST_ANON_KEY;
  if (!url || !key) throw new Error("local_postgrest_not_configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("local_postgrest_url_invalid");
  }
  return { url: parsed.origin, key };
}

/**
 * Server-only compatibility client for standalone PostgREST.
 * Supabase SDK query builders are retained, but all REST requests are rewritten
 * from /rest/v1/* to the local PostgREST root. No cloud Supabase URL is used.
 */
export function createLocalPostgrestClient(userId?: string) {
  const config = getLocalApiConfig();
  const localFetch: typeof fetch = async (input, init) => {
    const originalUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(originalUrl);
    if (url.origin === config.url) {
      url.pathname = url.pathname.replace(/^\/rest\/v1(?=\/|$)/, "") || "/";
    }
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    // Explicitly attach the validated local-session JWT at the final fetch
    // boundary so the PostgREST request cannot silently use the anon API key.
    const token = await getLocalAccessToken(userId);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else if (userId) throw new Error("local_session_required_for_postgrest");
    const request = input instanceof Request ? new Request(url, input) : url.toString();
    return fetch(request, { ...init, headers });
  };

  return createClient<Database>(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => {
      const token = await getLocalAccessToken(userId);
      if (token) return token;
      // Public data reads may use the anon role, but an authenticated client
      // must never silently downgrade to anon for writes or protected RPCs.
      if (userId) throw new Error("local_session_required_for_postgrest");
      return config.key;
    },
    global: { fetch: localFetch },
  });
}
