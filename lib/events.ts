import { cache } from "react";
import { getSupabaseConfig } from "@/lib/supabase/config";
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
  templateUrl: string | null;
  widthMm: number;
  heightMm: number;
  qrX: number;
  qrY: number;
  qrSize: number;
};

export const defaultQrConfig: QrConfig = {
  mode: "digital",
  claimMode: "automatic",
  templateUrl: null,
  widthMm: 85.6,
  heightMm: 54,
  qrX: 68,
  qrY: 50,
  qrSize: 22,
};

export type EventTheme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  surface: string;
  headerStyle?: "minimal" | "editorial" | "split";
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
  publishedVersion?: number | null;
  hasDraftChanges?: boolean;
  liveSlug?: string;
  capacity?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  posterUrl: string | null;
  participantPreview?: ParticipantPreview[];
};

export const demoEvents: PassFlowEvent[] = [
  {
    id: "evt_adorne_exhibition",
    name: "Adorne Nails Exhibition",
    slug: "adorne-nails-exhibition",
    eyebrow: "Beauty Exhibition",
    description:
      "A multi-zone beauty experience with workshops, exhibitions, product showcases, and QR-based access.",
    venue: "Adorne Studio",
    dateLabel: "12 October 2026",
    attendeeCount: 428,
    checkedInCount: 286,
    theme: {
      primary: "#7b1734",
      secondary: "#f0b8c6",
      background: "#fff8f9",
      foreground: "#211216",
      surface: "#ffffff",
    },
    qrConfig: defaultQrConfig,
    heroImageUrl: null,
    logoUrl: null,
    posterUrl: null,
  },
  {
    id: "evt_adorne_workshop",
    name: "Adorne Nails Workshop",
    slug: "adorne-nails-workshop",
    eyebrow: "Beauty Workshop",
    description:
      "A hands-on nail workshop with creator rooms, product showcases, and live visitor tracking.",
    venue: "Adorne Studio",
    dateLabel: "24 October 2026",
    attendeeCount: 260,
    checkedInCount: 112,
    theme: {
      primary: "#5b5df0",
      secondary: "#b8b9ff",
      background: "#0f1014",
      foreground: "#f7f7fa",
      surface: "#191a20",
    },
    qrConfig: defaultQrConfig,
    heroImageUrl: null,
    logoUrl: null,
    posterUrl: null,
  },
];

export function getEventBySlug(slug: string) {
  return demoEvents.find((event) => event.slug === slug);
}

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
    templateUrl:
      typeof qrValue.template_url === "string"
        ? qrValue.template_url
        : defaultQrConfig.templateUrl,
    widthMm:
      typeof qrValue.width_mm === "number"
        ? qrValue.width_mm
        : defaultQrConfig.widthMm,
    heightMm:
      typeof qrValue.height_mm === "number"
        ? qrValue.height_mm
        : defaultQrConfig.heightMm,
    qrX:
      typeof qrValue.qr_x === "number" ? qrValue.qr_x : defaultQrConfig.qrX,
    qrY:
      typeof qrValue.qr_y === "number" ? qrValue.qr_y : defaultQrConfig.qrY,
    qrSize:
      typeof qrValue.qr_size === "number"
        ? qrValue.qr_size
        : defaultQrConfig.qrSize,
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    eyebrow: row.status === "published" ? "Published event" : "Draft event",
    description: row.description ?? "",
    venue: row.venue ?? "",
    status: row.status,
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
    theme: { ...safeTheme, headerStyle },
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
    const { supabase } = await requireOrganizer(`/admin/events/${id}`);
    const { data: allowed } = await supabase.rpc("is_event_manager", {
      p_event_id: id,
    });
    if (!allowed) return undefined;

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

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("organization_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Events could not be loaded.");

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

export async function getPublishedEvents(): Promise<PassFlowEvent[]> {
  if (!getSupabaseConfig()) return demoEvents;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at");
  if (error) throw new Error("Events are temporarily unavailable.");
  return Promise.all(
    (data ?? []).map(async (row) => {
      const preview = await loadPublishedParticipantPreview(supabase, row.id);
      return mapEvent(row, preview.count, 0, preview.people);
    }),
  );
}

/** Only real, published events appear in the public homepage collection. */
export async function getRecentPublishedEvents(): Promise<PassFlowEvent[]> {
  if (!getSupabaseConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(3);
  if (error) throw new Error("Recent events are temporarily unavailable.");
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
  if (!getSupabaseConfig()) return getEventBySlug(slug);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Event is temporarily unavailable.");
  return data ? mapEvent(data) : undefined;
}
