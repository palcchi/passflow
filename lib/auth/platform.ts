import "server-only";
import type { User } from "@supabase/supabase-js";

// PassFlow staff who review organizer applications. Set PASSFLOW_ADMIN_EMAILS (comma-separated) on the server.
export function isPlatformAdmin(user: Pick<User, "email" | "email_confirmed_at"> | null | undefined) {
  const email = user?.email?.toLowerCase();
  if (!email || !user?.email_confirmed_at) return false;
  return (process.env.PASSFLOW_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email);
}
