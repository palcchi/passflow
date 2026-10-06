import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { isPlatformAdmin } from "@/lib/auth/platform";

// Self-serve organizers run one event at a time; archiving it frees the slot. PassFlow admins are not limited.
export const EVENTS_PER_ORGANIZER = 1;
export async function canCreateEvent(supabase: SupabaseClient<Database>, user: User) {
  if (isPlatformAdmin(user)) return true;
  const ids = (await getMemberships()).memberships.filter((m) => canManage(m.role)).map((m) => m.organization_id);
  if (!ids.length) return false;
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).in("organization_id", ids).neq("status", "archived");
  return (count ?? 0) < EVENTS_PER_ORGANIZER;
}
