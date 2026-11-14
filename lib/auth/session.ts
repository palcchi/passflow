import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server";
import { createLocalPostgrestClient } from "@/lib/supabase/local-server";
import { getLocalSession } from "@/lib/auth/local-session";
import type { User } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { postgresQuery } from "@/lib/db/postgres";
import { canManage, safeNext } from "./redirect";
import { isValidE164Phone } from "./phone";

export const getAuthContext = cache(async () => {
  try {
    const session = await getLocalSession();
    if (session) {
      const user = {
        id: session.user.id,
        app_metadata: { provider: "google", providers: ["google"] },
        user_metadata: session.user.user_metadata,
        aud: "authenticated",
        created_at: "",
        is_anonymous: false,
        email: session.user.email ?? undefined,
        email_confirmed_at: session.user.email_confirmed_at ? new Date(session.user.email_confirmed_at).toISOString() : undefined,
      } as User;
      return { supabase: createLocalPostgrestClient(session.user.id), user };
    }
  } catch {
    if (process.env.PASSFLOW_LOCAL_AUTH === "true") return null;
  }
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") return null;
  if (!getSupabaseConfig()) return null;
  try {
    const supabase = await createServerAuthClient();
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
  const requestedPath = next.split("?")[0];
  const phone = typeof context.user.user_metadata?.phone === "string" ? context.user.user_metadata.phone.trim() : "";
  const phoneVerified = context.user.user_metadata?.phone_verified === true;
  if ((!isValidE164Phone(phone) || !phoneVerified) && requestedPath !== "/phone") {
    redirect(`/phone?next=${encodeURIComponent(safeNext(next))}`);
  }
  return context;
}

export const getMemberships = cache(async () => {
  const context = await getAuthContext();
  if (!context) return { memberships: [], unavailable: false };

  // Opt-in canary: use the self-hosted PostgreSQL membership rows as the
  // authority while retaining Supabase for identity/session validation.
  // Fail closed if local membership data is unavailable; never silently grant
  // organizer access from a fallback during this canary.
  if (process.env.PASSFLOW_LOCAL_MEMBERSHIPS === "true") {
    try {
      const local = await postgresQuery<{ organization_id: string; role: string }>(
        "SELECT organization_id, role FROM public.organization_members WHERE user_id = $1",
        [context.user.id],
      );
      return { memberships: local.rows, unavailable: false };
    } catch {
      console.warn("[migration-local] organization_members read unavailable");
      return { memberships: [], unavailable: true };
    }
  }

  const { data, error } = await context.supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", context.user.id);

  // Opt-in, read-only shadow comparison. Supabase remains authoritative until
  // local reads are validated and a separate cutover is explicitly approved.
  if (process.env.PASSFLOW_DUAL_READ_MEMBERSHIPS === "true") {
    try {
      const local = await postgresQuery<{ organization_id: string; role: string }>(
        "SELECT organization_id, role FROM public.organization_members WHERE user_id = $1",
        [context.user.id],
      );
      const normalize = (rows: Array<{ organization_id: string; role: string }>) =>
        rows.map((row) => row.organization_id + ":" + row.role).sort();
      const primary = normalize((data ?? []) as Array<{ organization_id: string; role: string }>);
      const shadow = normalize(local.rows);
      if (JSON.stringify(primary) !== JSON.stringify(shadow)) {
        console.warn("[migration-shadow] organization_members mismatch", {
          primaryCount: primary.length,
          shadowCount: shadow.length,
        });
      }
    } catch {
      // Shadow-read failures must not change user-visible auth behavior.
      console.warn("[migration-shadow] organization_members local read unavailable");
    }
  }

  return { memberships: error ? [] : (data ?? []), unavailable: !!error };
});

export async function requireOrganizer(next = "/organizer/events") {
  const context = await requireUser(next);
  const { memberships, unavailable } = await getMemberships();
  if (unavailable) redirect("/unauthorized");
  // Attendees who open the workspace are offered the organizer application instead of a dead end.
  if (!memberships.some((membership) => canManage(membership.role))) redirect("/organizer/start");
  return context;
}

export async function requireOrganizerMembership(next = "/organizer/events") {
  const context = await requireUser(next);
  const { memberships, unavailable } = await getMemberships();
  const membership = memberships.find((item) => canManage(item.role));
  if (unavailable) redirect("/unauthorized");
  if (!membership) redirect("/organizer/start");
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

/** Account profile from auth metadata (full name, username, avatar or Google picture). */
export function accountProfile(user: { email?: string | null; user_metadata: Record<string, unknown> }) {
  const read = (key: string) => (typeof user.user_metadata[key] === "string" ? (user.user_metadata[key] as string).trim().replace(/\s+/g, " ") : "");
  const fullName = read("full_name");
  const username = read("username");
  return {
    fullName,
    name: fullName || username || user.email?.split("@")[0] || "",
    email: user.email ?? null,
    avatarUrl: read("avatar_url") || read("picture") || null,
  };
}
