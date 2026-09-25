import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { canManage, safeNext } from "./redirect";

export const getAuthContext = cache(async () => {
  if (!getSupabaseConfig()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
});

export async function requireUser(next = "/account") {
  const context = await getAuthContext();
  if (!context) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return context;
}

export const getMemberships = cache(async () => {
  const context = await getAuthContext();
  if (!context) return { memberships: [], unavailable: false };
  const { data, error } = await context.supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", context.user.id);
  return { memberships: error ? [] : (data ?? []), unavailable: !!error };
});

export async function requireOrganizer(next = "/admin") {
  const context = await requireUser(next);
  const { memberships, unavailable } = await getMemberships();
  if (unavailable || !memberships.some((membership) => canManage(membership.role))) {
    redirect("/unauthorized");
  }
  return context;
}

export async function requireOrganizerMembership(next = "/admin") {
  const context = await requireUser(next);
  const { memberships, unavailable } = await getMemberships();
  const membership = memberships.find((item) => canManage(item.role));
  if (unavailable || !membership) redirect("/unauthorized");
  return { ...context, membership };
}

export async function requireStation(stationId: string) {
  const context = await requireUser(`/scan/${stationId}`);
  let query = context.supabase
    .from("scanner_stations")
    .select("id, event_id, zone_id, name, slug, mode, config, is_active")
    .eq("is_active", true);

  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(stationId)) {
    query = query.eq("id", stationId);
  } else {
    query = query.eq("slug", stationId);
  }

  const { data: stations, error } = await query.limit(2);
  if (error || !stations || stations.length !== 1) redirect("/unauthorized");
  return { ...context, station: stations[0] };
}
