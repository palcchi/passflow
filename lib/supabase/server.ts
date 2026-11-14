import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import { createLocalPostgrestClient } from "./local-server";
import { getLocalSession } from "@/lib/auth/local-session";

// Cloud auth client, retained only for the migration fallback and provider callbacks.
export async function createServerAuthClient() {
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    throw new Error("Cloud auth is disabled while local authentication is enabled");
  }
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy refreshes them first.
        }
      },
    },
  });
}

// Data client. Once the local DB cutover flag is enabled, all .from()/.rpc()
// calls use the self-hosted PostgREST endpoint; auth methods are handled by
// local-auth helpers and must not be called on this client.
export async function createServerSupabaseClient() {
  if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
    // Resolve local identity once inside the request context and bind it to the
    // PostgREST client; do not depend on cookies being readable in fetch callbacks.
    const session = process.env.PASSFLOW_LOCAL_AUTH === "true"
      ? await getLocalSession()
      : null;
    return createLocalPostgrestClient(session?.user.id);
  }
  return createServerAuthClient();
}
