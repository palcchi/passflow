import { cache } from "react";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { postgresQuery } from "@/lib/db/postgres";
import { attendeePhotoColumns, attendeePhotoUrls } from "@/lib/attendee-photos";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const defaultEventTheme = {
  primary: "#292a25",
  secondary: "#eee9d8",
  background: "#ffffff",
  foreground: "#242421",
  surface: "#ffffff",
  headerStyle: "editorial",
};

export type QrDeliveryMode =
  | "digital"
  | "id_card_portrait"
  | "id_card_landscape"
  | "wristband";

export type QrClaimMode = "claim" | "automatic";

export type QrConfig = {
  mode: QrDeliveryMode;
  claimMode: QrClaimMode;
};

export const defaultQrConfig: QrConfig = {
  mode: "digital",
  claimMode: "automatic",
};

export type EventTheme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  surface: string;
  headerStyle?: "minimal" | "editorial" | "split";
  /** Default page text and style; empty text falls back to PassFlow defaults. */
  tagline?: string;
  ctaLabel?: string;
  font?: "sans" | "serif" | "mono";
  corners?: "rounded" | "soft" | "sharp";
};

export type ParticipantPreview = {
  name: string;
  imageUrl?: string | null;
};

export type PassFlowEvent = {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  venue: string;
  dateLabel: string;
  attendeeCount: number;
  checkedInCount: number;
  theme: EventTheme;
  qrConfig: QrConfig;
  status?: string;
  visibility?: "public" | "private";
  registrationOpen?: boolean;
  requiresApproval?: boolean;
  publishedVersion?: number | null;
  hasDraftChanges?: boolean;
  liveSlug?: string;
  subdomainLabel?: string | null;
  capacity?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  posterUrl: string | null;
  participantPreview?: ParticipantPreview[];
};

type EventRow =
  import("@/lib/supabase/database.types").Database["public"]["Tables"]["events"]["Row"];

type EventClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function loadPublishedParticipantPreview(
  supabase: EventClient,
  eventId: string,
): Promise<{ count: number; people: ParticipantPreview[] }> {
  const { data: attendees, count } = await supabase
    .from("attendees")
    .select("id,name", { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(3);

  const rows = attendees ?? [];
  if (!rows.length) return { count: count ?? 0, people: [] };

  const { data: profiles } = await supabase
    .from("attendee_profiles")
    .select(attendeePhotoColumns)
    .eq("event_id", eventId)
    .in("attendee_id", rows.map((attendee) => attendee.id));
  const photos = await attendeePhotoUrls(supabase, profiles);

  return {
    count: count ?? rows.length,
    people: rows.map((attendee) => ({ name: attendee.name, imageUrl: photos.get(attendee.id) ?? null })),
  };
}

function mapEvent(
  row: EventRow,
  attendeeCount = 0,
  checkedInCount = 0,
  participantPreview: ParticipantPreview[] = [],
): PassFlowEvent {
  const theme =
    row.theme && typeof row.theme === "object" && !Array.isArray(row.theme)
      ? (row.theme as Partial<EventTheme>)
      : {};
  const safeTheme = Object.fromEntries(
    Object.entries(defaultEventTheme).map(([key, fallback]) => {
      const value = theme[key as keyof EventTheme];
      return [
        key,
        typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)
          ? value
          : fallback,
      ];
    }),
  ) as EventTheme;
  const headerStyle =
    theme.headerStyle === "minimal" ||
    theme.headerStyle === "split" ||
    theme.headerStyle === "editorial"
      ? theme.headerStyle
      : "editorial";

  const qrValue =
    row.qr_config &&
    typeof row.qr_config === "object" &&
    !Array.isArray(row.qr_config)
      ? (row.qr_config as Record<string, unknown>)
      : {};
  const qrMode = [
    "digital",
    "id_card_portrait",
    "id_card_landscape",
    "wristband",
  ].includes(String(qrValue.mode))
    ? (String(qrValue.mode) as QrDeliveryMode)
    : defaultQrConfig.mode;
  const claimMode: QrClaimMode =
    qrValue.claim_mode === "claim" || qrValue.claim_mode === "automatic"
      ? qrValue.claim_mode
      : qrMode === "wristband"
        ? "claim"
        : "automatic";

  const qrConfig: QrConfig = {
    mode: qrMode,
    claimMode,
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    eyebrow: typeof theme.tagline === "string" ? theme.tagline.trim().slice(0, 60) : "",
    description: row.description ?? "",
    venue: row.venue ?? "",
    status: row.status,
    visibility: row.visibility === "private" ? "private" : "public",
    registrationOpen: row.registration_open !== false,
    requiresApproval: row.requires_approval === true,
    publishedVersion: row.published_version,
    capacity: row.capacity ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLabel: row.starts_at
      ? new Intl.DateTimeFormat("en-US", {
          dateStyle: "long",
          timeZone: "Asia/Jakarta",
        }).format(new Date(row.starts_at))
      : "Date to be announced",
    attendeeCount,
    checkedInCount,
    theme: {
      ...safeTheme,
      headerStyle,
      tagline: typeof theme.tagline === "string" ? theme.tagline.trim().slice(0, 60) : "",
      ctaLabel: typeof theme.ctaLabel === "string" ? theme.ctaLabel.trim().slice(0, 28) : "",
      font: theme.font === "serif" || theme.font === "mono" ? theme.font : "sans",
      corners: theme.corners === "soft" || theme.corners === "sharp" ? theme.corners : "rounded",
    },
    qrConfig,
    heroImageUrl: row.hero_image_url,
    logoUrl: row.logo_url,
    posterUrl: row.poster_url,
    participantPreview,
  };
}

export const getManagedEvent = cache(
  async (id: string): Promise<PassFlowEvent | undefined> => {
    const { requireOrganizer } = await import("@/lib/auth/session");
    const { supabase, user } = await requireOrganizer(`/organizer/events/${id}`);

    // During the self-host cutover, authorize against the same local PostgreSQL
    // membership source used by requireOrganizer/getManagedEvents. Calling the
    // PostgREST RPC here can incorrectly return false when local JWT claims are
    // not propagated as expected, making an existing event look like a 404.
    if (process.env.PASSFLOW_LOCAL_MEMBERSHIPS === "true" && process.env.PASSFLOW_LOCAL_DATABASE === "true") {
      const access = await postgresQuery<{ allowed: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM public.events e
           JOIN public.organization_members m ON m.organization_id = e.organization_id
           WHERE e.id = $1::uuid
             AND m.user_id = $2::uuid
             AND (
               m.role = 'owner'
               OR (m.role = 'admin' AND (
                 e.created_by = $2::uuid
                 OR NOT EXISTS (
                   SELECT 1 FROM public.events e2
                   WHERE e2.organization_id = e.organization_id
                     AND e2.created_by = $2::uuid
                 )
               ))
             )
         ) AS allowed`,
        [id, user.id],
      );
      if (!access.rows[0]?.allowed) return undefined;
    } else {
      const { data: allowed, error: accessError } = await supabase.rpc("is_event_manager", {
        p_event_id: id,
      });
      if (accessError || !allowed) return undefined;
    }

    if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
      const [eventResult, registered, checked, draft, address] = await Promise.all([
        postgresQuery<EventRow>(
          "SELECT * FROM public.events WHERE id = $1::uuid LIMIT 1",
          [id],
        ),
        postgresQuery<{ count: number }>(
          "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1::uuid",
          [id],
        ),
        postgresQuery<{ count: number }>(
          "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1::uuid AND checked_in_at IS NOT NULL",
          [id],
        ),
        postgresQuery<{ config: unknown }>(
          "SELECT config FROM public.event_config_drafts WHERE event_id = $1::uuid LIMIT 1",
          [id],
        ),
        postgresQuery<{ label: string }>(
          "SELECT label FROM public.event_subdomains WHERE event_id = $1::uuid LIMIT 1",
          [id],
        ),
      ]);
      const data = eventResult.rows[0];
      if (!data) return undefined;
      const draftConfig = draft.rows[0]?.config;
      const row = draftConfig && typeof draftConfig === "object" && !Array.isArray(draftConfig)
        ? { ...data, ...draftConfig } as EventRow
        : data;
      return {
        ...mapEvent(row, registered.rows[0]?.count ?? 0, checked.rows[0]?.count ?? 0),
        status: data.status,
        publishedVersion: data.published_version,
        hasDraftChanges: Boolean(draft.rows[0]),
        liveSlug: data.slug,
        subdomainLabel: address.rows[0]?.label ?? null,
      };
    }

    const [{ data, error }, registered, checked, draft] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("attendees")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id),
      supabase
        .from("attendees")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .not("checked_in_at", "is", null),
      supabase.from("event_config_drafts").select("config").eq("event_id", id).maybeSingle(),
    ]);

    if (error) throw new Error("Event could not be loaded.");
    return data
      ? { ...mapEvent(draft.data?.config && typeof draft.data.config === "object" && !Array.isArray(draft.data.config)
          ? { ...data, ...draft.data.config } as EventRow : data, registered.count ?? 0, checked.count ?? 0),
          status: data.status, publishedVersion: data.published_version, hasDraftChanges: Boolean(draft.data), liveSlug: data.slug }
      : undefined;
  },
);

export async function getManagedEvents(): Promise<PassFlowEvent[]> {
  const { requireOrganizer, getMemberships } = await import("@/lib/auth/session");
  const { supabase } = await requireOrganizer();
  const { memberships } = await getMemberships();
  const ids = memberships
    .filter((membership) => membership.role === "owner" || membership.role === "admin")
    .map((membership) => membership.organization_id);

  if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
    if (ids.length === 0) return [];
    try {
      const local = await postgresQuery<EventRow>(
        "SELECT * FROM public.events WHERE organization_id = ANY($1::uuid[]) ORDER BY created_at DESC",
        [ids],
      );
      return Promise.all(local.rows.map(async (row) => {
        const [registered, checked, people] = await Promise.all([
          postgresQuery<{ count: number }>(
            "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1",
            [row.id],
          ),
          postgresQuery<{ count: number }>(
            "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1 AND checked_in_at IS NOT NULL",
            [row.id],
          ),
          postgresQuery<{ name: string }>(
            "SELECT name FROM public.attendees WHERE event_id = $1 ORDER BY created_at DESC LIMIT 3",
            [row.id],
          ),
        ]);
        return mapEvent(
          row,
          registered.rows[0]?.count ?? 0,
          checked.rows[0]?.count ?? 0,
          people.rows.map((person) => ({ name: person.name })),
        );
      }));
    } catch {
      throw new Error("Events could not be loaded from the local database.");
    }
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("organization_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Events could not be loaded.");

  // Opt-in, read-only event shadow comparison during self-host migration.
  // Supabase remains the source of truth; this block never changes the response.
  if (process.env.PASSFLOW_DUAL_READ_MEMBERSHIPS === "true" && ids.length > 0) {
    try {
      const local = await postgresQuery<{
        id: string; organization_id: string; name: string; slug: string; status: string;
      }>(
        "SELECT id, organization_id, name, slug, status FROM public.events WHERE organization_id = ANY($1::uuid[])",
        [ids],
      );
      const normalize = (rows: Array<{ id: string; organization_id: string; name: string; slug: string; status: string }>) =>
        rows.map((row) => [row.id, row.organization_id, row.name, row.slug, row.status].join("|")).sort();
      const primary = normalize((data ?? []).map((row) => ({
        id: row.id, organization_id: row.organization_id, name: row.name, slug: row.slug, status: row.status,
      })));
      const shadow = normalize(local.rows);
      if (JSON.stringify(primary) !== JSON.stringify(shadow)) {
        console.warn("[migration-shadow] managed events mismatch", {
          primaryCount: primary.length,
          shadowCount: shadow.length,
        });
      }
    } catch {
      // Local shadow-read failure must not change organizer dashboard behavior.
      console.warn("[migration-shadow] managed events local read unavailable");
    }
  }

  return Promise.all(
    (data ?? []).map(async (row) => {
      const [attendees, checked, previewResult] = await Promise.all([
        supabase
          .from("attendees")
          .select("id", { count: "exact", head: true })
          .eq("event_id", row.id),
        supabase
          .from("attendees")
          .select("id", { count: "exact", head: true })
          .eq("event_id", row.id)
          .not("checked_in_at", "is", null),
        supabase
          .from("attendees")
          .select("id,name")
          .eq("event_id", row.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      // Compare local registration/check-in counts without changing the
      // Supabase-backed response. Only aggregate counts are logged.
      if (process.env.PASSFLOW_DUAL_READ_MEMBERSHIPS === "true") {
        try {
          const local = await postgresQuery<{
            attendee_count: number; checked_in_count: number;
          }>(
            `SELECT
               (SELECT count(*)::int FROM public.attendees WHERE event_id = $1) AS attendee_count,
               (SELECT count(*)::int FROM public.attendees WHERE event_id = $1 AND checked_in_at IS NOT NULL) AS checked_in_count`,
            [row.id],
          );
          const counts = local.rows[0];
          if (counts && (
            counts.attendee_count !== (attendees.count ?? 0) ||
            counts.checked_in_count !== (checked.count ?? 0)
          )) {
            console.warn("[migration-shadow] attendee aggregates mismatch", {
              sourceAttendees: attendees.count ?? 0,
              localAttendees: counts.attendee_count,
              sourceCheckedIn: checked.count ?? 0,
              localCheckedIn: counts.checked_in_count,
            });
          }
        } catch {
          console.warn("[migration-shadow] attendee aggregates local read unavailable");
        }
      }

      const previewAttendees = previewResult.data ?? [];
      const previewIds = previewAttendees.map((attendee) => attendee.id);
      const { data: profileRows } = previewIds.length
        ? await supabase
            .from("attendee_profiles")
            .select(attendeePhotoColumns)
            .eq("event_id", row.id)
            .in("attendee_id", previewIds)
        : { data: [] };
      const photos = await attendeePhotoUrls(supabase, profileRows);
      const participantPreview = previewAttendees.map((attendee) => ({
        name: attendee.name,
        imageUrl: photos.get(attendee.id) ?? null,
      }));

      return mapEvent(
        row,
        attendees.count ?? 0,
        checked.count ?? 0,
        participantPreview,
      );
    }),
  );
}

/** Public events, plus private ones the viewer is registered for (`include`). */
export async function getPublishedEvents(include: Iterable<string> = []): Promise<PassFlowEvent[]> {
  if (process.env.PASSFLOW_LOCAL_DATABASE === "true" || process.env.PASSFLOW_LOCAL_PUBLISHED_EVENTS === "true") {
    try {
      const allowedIds = Array.from(include);
      const local = await postgresQuery<EventRow>(
        `SELECT * FROM public.events
         WHERE status = 'published'
           AND (COALESCE(visibility, 'public') <> 'private' OR id::text = ANY($1::text[]))
         ORDER BY starts_at ASC`,
        [allowedIds],
      );
      return Promise.all(local.rows.map(async (row) => {
        const [countResult, peopleResult] = await Promise.all([
          postgresQuery<{ count: number }>(
            "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1",
            [row.id],
          ),
          postgresQuery<{ name: string }>(
            "SELECT name FROM public.attendees WHERE event_id = $1 ORDER BY created_at DESC LIMIT 3",
            [row.id],
          ),
        ]);
        return mapEvent(
          row,
          countResult.rows[0]?.count ?? 0,
          0,
          peopleResult.rows.map((person) => ({ name: person.name })),
        );
      }));
    } catch {
      throw new Error("Events are temporarily unavailable.");
    }
  }
  if (!getSupabaseConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at");
  if (error) throw new Error("Events are temporarily unavailable.");
  const allowed = new Set(include);
  return Promise.all(
    (data ?? []).filter((row) => row.visibility !== "private" || allowed.has(row.id)).map(async (row) => {
      const preview = await loadPublishedParticipantPreview(supabase, row.id);
      return mapEvent(row, preview.count, 0, preview.people);
    }),
  );
}

/** Only real, published events appear in the public homepage collection. */
export async function getRecentPublishedEvents(): Promise<PassFlowEvent[]> {
  // Explicit opt-in for the first local read path. Keep disabled until the
  // operator verifies parity; this path does not call Supabase for event data.
  if (process.env.PASSFLOW_LOCAL_DATABASE === "true" || process.env.PASSFLOW_LOCAL_PUBLIC_EVENTS === "true") {
    try {
      const local = await postgresQuery<EventRow>(
        `SELECT * FROM public.events
         WHERE status = 'published' AND COALESCE(visibility, 'public') = 'public'
         ORDER BY created_at DESC, id DESC
         LIMIT 3`,
      );
      return Promise.all(local.rows.map(async (row) => {
        const [countResult, peopleResult] = await Promise.all([
          postgresQuery<{ count: number }>(
            "SELECT count(*)::int AS count FROM public.attendees WHERE event_id = $1",
            [row.id],
          ),
          postgresQuery<{ name: string }>(
            "SELECT name FROM public.attendees WHERE event_id = $1 ORDER BY created_at DESC LIMIT 3",
            [row.id],
          ),
        ]);
        return mapEvent(
          row,
          countResult.rows[0]?.count ?? 0,
          0,
          peopleResult.rows.map((person) => ({ name: person.name })),
        );
      }));
    } catch {
      // Fail closed rather than silently showing demo data or changing source.
      throw new Error("Recent events are temporarily unavailable.");
    }
  }
  if (!getSupabaseConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(3);
  if (error) throw new Error("Recent events are temporarily unavailable.");

  // Read-only comparison for the public homepage feed. Supabase remains the
  // source of truth until the local result has been verified in production-like use.
  if (process.env.PASSFLOW_DUAL_READ_MEMBERSHIPS === "true") {
    try {
      const local = await postgresQuery<{
        id: string; organization_id: string; name: string; slug: string; status: string;
        visibility: string | null; created_at: string | null;
      }>(
        `SELECT id, organization_id, name, slug, status, visibility, created_at
         FROM public.events
         WHERE status = 'published' AND COALESCE(visibility, 'public') = 'public'
         ORDER BY created_at DESC, id DESC
         LIMIT 3`,
      );
      const normalize = (rows: Array<{ id: string; organization_id: string; name: string; slug: string; status: string }>) =>
        rows.map((row) => [row.id, row.organization_id, row.name, row.slug, row.status].join("|")).sort();
      const primary = normalize((data ?? []).map((row) => ({
        id: row.id, organization_id: row.organization_id, name: row.name, slug: row.slug, status: row.status,
      })));
      const shadow = normalize(local.rows);
      if (JSON.stringify(primary) !== JSON.stringify(shadow)) {
        console.warn("[migration-shadow] public homepage events mismatch", {
          sourceCount: primary.length,
          localCount: shadow.length,
        });
      }
    } catch {
      console.warn("[migration-shadow] public homepage events local read unavailable");
    }
  }

  return Promise.all(
    (data ?? []).map(async (row) => {
      const preview = await loadPublishedParticipantPreview(supabase, row.id);
      return mapEvent(row, preview.count, 0, preview.people);
    }),
  );
}

export async function getPublishedEvent(
  slug: string,
): Promise<PassFlowEvent | undefined> {
  // Opt-in local PostgreSQL path for public event detail pages. Keep separate
  // from the homepage flag so each read surface can be validated independently.
  if (process.env.PASSFLOW_LOCAL_DATABASE === "true" || process.env.PASSFLOW_LOCAL_PUBLIC_EVENT_DETAIL === "true") {
    try {
      const local = await postgresQuery<EventRow>(
        `SELECT * FROM public.events WHERE slug = $1 AND status = 'published' LIMIT 1`,
        [slug],
      );
      return local.rows[0] ? mapEvent(local.rows[0]) : undefined;
    } catch {
      throw new Error("Event is temporarily unavailable.");
    }
  }
  if (!getSupabaseConfig()) return undefined;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Event is temporarily unavailable.");

  // Shadow-compare the same published event without changing the response source.
  if (process.env.PASSFLOW_DUAL_READ_MEMBERSHIPS === "true" && data) {
    try {
      const local = await postgresQuery<{
        id: string; organization_id: string; name: string; slug: string; status: string;
      }>(
        `SELECT id, organization_id, name, slug, status
         FROM public.events WHERE slug = $1 AND status = 'published' LIMIT 1`,
        [slug],
      );
      const source = [data.id, data.organization_id, data.name, data.slug, data.status].join("|");
      const shadow = local.rows[0]
        ? [local.rows[0].id, local.rows[0].organization_id, local.rows[0].name, local.rows[0].slug, local.rows[0].status].join("|")
        : null;
      if (source !== shadow) {
        console.warn("[migration-shadow] public event detail mismatch", {
          sourceFound: true,
          localFound: Boolean(local.rows[0]),
        });
      }
    } catch {
      console.warn("[migration-shadow] public event detail local read unavailable");
    }
  }

  return data ? mapEvent(data) : undefined;
}

/** The signed-in user's registration state per event id. */
export async function getMyRegistrations(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data } = await supabase.from("attendees").select("event_id,approval_status").eq("user_id", userId);
  return Object.fromEntries((data ?? []).map((row) => [row.event_id, row.approval_status])) as Record<string, "approved" | "pending" | "rejected">;
}
