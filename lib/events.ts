import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type EventTheme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  surface: string;
};

export type PassFlowEvent = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  venue: string;
  startsAt: string | null;
  endsAt: string | null;
  dateLabel: string;
  capacity: number | null;
  attendeeCount: number;
  checkedInCount: number;
  status: "draft" | "published" | "archived";
  theme: EventTheme;
  logoUrl: string | null;
  heroImageUrl: string | null;
  posterUrl: string | null;
};

export const defaultEventTheme: EventTheme = {
  primary: "#7448ff",
  secondary: "#eee8ff",
  background: "#f5f5f2",
  foreground: "#151515",
  surface: "#ffffff",
};

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeEventTheme(value: Json): EventTheme {
  if (!value || Array.isArray(value) || typeof value !== "object") return defaultEventTheme;
  const theme = value as Record<string, unknown>;
  return {
    primary: stringValue(theme.primary, defaultEventTheme.primary),
    secondary: stringValue(theme.secondary, defaultEventTheme.secondary),
    background: stringValue(theme.background, defaultEventTheme.background),
    foreground: stringValue(theme.foreground, defaultEventTheme.foreground),
    surface: stringValue(theme.surface, defaultEventTheme.surface),
  };
}

export function formatEventDate(startsAt: string | null) {
  if (!startsAt) return "Date to be announced";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(startsAt));
}

function mapEvent(
  row: {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    description: string | null;
    venue: string | null;
    starts_at: string | null;
    ends_at: string | null;
    capacity: number | null;
    status: "draft" | "published" | "archived";
    theme: Json;
    logo_url: string | null;
    hero_image_url: string | null;
    poster_url: string | null;
  },
  attendeeCount = 0,
  checkedInCount = 0,
): PassFlowEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    eyebrow: row.status === "published" ? "Live Event" : row.status === "draft" ? "Draft Event" : "Archived Event",
    description: row.description ?? "",
    venue: row.venue ?? "Venue to be announced",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLabel: formatEventDate(row.starts_at),
    capacity: row.capacity,
    attendeeCount,
    checkedInCount,
    status: row.status,
    theme: normalizeEventTheme(row.theme),
    logoUrl: row.logo_url,
    heroImageUrl: row.hero_image_url,
    posterUrl: row.poster_url,
  };
}

async function countsForEvent(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ count: attendeeCount }, { count: checkedInCount }] = await Promise.all([
    supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId).not("checked_in_at", "is", null),
  ]);
  return { attendeeCount: attendeeCount ?? 0, checkedInCount: checkedInCount ?? 0 };
}

export async function getEventBySlug(slug: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, organization_id, name, slug, description, venue, starts_at, ends_at, capacity, status, theme, logo_url, hero_image_url, poster_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const counts = await countsForEvent(data.id);
  return mapEvent(data, counts.attendeeCount, counts.checkedInCount);
}

export async function getEventById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, organization_id, name, slug, description, venue, starts_at, ends_at, capacity, status, theme, logo_url, hero_image_url, poster_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const counts = await countsForEvent(data.id);
  return mapEvent(data, counts.attendeeCount, counts.checkedInCount);
}

export async function listWorkspaceEvents() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, organization_id, name, slug, description, venue, starts_at, ends_at, capacity, status, theme, logo_url, hero_image_url, poster_url")
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return Promise.all(
    data.map(async (row) => {
      const counts = await countsForEvent(row.id);
      return mapEvent(row, counts.attendeeCount, counts.checkedInCount);
    }),
  );
}
