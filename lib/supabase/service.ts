import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Server-only client that bypasses RLS. Callers must authorize the request themselves first.
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("service_not_configured");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
