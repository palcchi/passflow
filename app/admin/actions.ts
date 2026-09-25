"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { defaultEventTheme } from "@/lib/events";

function text(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(formData: FormData, key: string, max = 500) {
  const value = text(formData, key, max);
  return value || null;
}

function numberValue(formData: FormData, key: string) {
  const raw = text(formData, key, 20);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, "_").slice(0, 40);
}

async function managedContext(eventId?: string) {
  const context = await requireOrganizerMembership(eventId ? `/admin/events/${eventId}` : "/admin");
  if (eventId) {
    const { data: allowed, error } = await context.supabase.rpc("is_event_manager", {
      p_event_id: eventId,
    });
    if (error || !allowed) redirect("/unauthorized");
  }
  return context;
}

function revalidateEvent(eventId: string, slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/appearance`);
  if (slug) {
    revalidatePath(`/e/${slug}`);
    revalidatePath(`/e/${slug}/claim`);
  }
}

export async function createEvent(formData: FormData) {
  const { supabase, membership } = await managedContext();
  const name = text(formData, "name", 120);
  const slug = slugify(text(formData, "slug", 100) || name);
  if (name.length < 2 || !slug) redirect("/admin/events/new?error=invalid");

  const startsAt = optionalText(formData, "startsAt", 40);
  const endsAt = optionalText(formData, "endsAt", 40);
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: membership.organization_id,
      name,
      slug,
      description: optionalText(formData, "description", 1200),
      venue: optionalText(formData, "venue", 160),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      capacity: numberValue(formData, "capacity"),
      status: "draft",
      theme: defaultEventTheme,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/admin/events/new?error=create");
  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 120);
  const slug = slugify(text(formData, "slug", 100) || name);
  if (!name || !slug) return;

  const startsAt = optionalText(formData, "startsAt", 40);
  const endsAt = optionalText(formData, "endsAt", 40);
  const { data } = await supabase
    .from("events")
    .update({
      name,
      slug,
      description: optionalText(formData, "description", 1200),
      venue: optionalText(formData, "venue", 160),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      capacity: numberValue(formData, "capacity"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("slug")
    .single();

  revalidateEvent(eventId, data?.slug);
}

export async function setEventStatus(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const status = text(formData, "status", 20);
  if (!["draft", "published", "archived"].includes(status)) return;
  const { supabase } = await managedContext(eventId);
  const { data } = await supabase
    .from("events")
    .update({ status: status as "draft" | "published" | "archived", updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select("slug")
    .single();
  revalidateEvent(eventId, data?.slug);
}

export async function deleteEvent(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const confirmation = text(formData, "confirmation", 100);
  const { supabase } = await managedContext(eventId);
  const { data: event } = await supabase.from("events").select("slug").eq("id", eventId).single();
  if (!event || confirmation !== event.slug) return;
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function createTicketType(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return;
  await supabase.from("ticket_types").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
    capacity: numberValue(formData, "capacity"),
  });
  revalidateEvent(eventId);
}

export async function createAttendee(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const email = optionalText(formData, "email", 254);
  const ticketTypeId = optionalText(formData, "ticketTypeId", 60);
  if (!name) return;
  await supabase.from("attendees").insert({
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    attendee_code: "ATT-" + randomBytes(4).toString("hex").toUpperCase(),
    name,
    email,
    phone: optionalText(formData, "phone", 40),
  });
  revalidateEvent(eventId);
}

export async function importAttendees(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const rows = text(formData, "rows", 20000).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return;

  const { data: tickets } = await supabase.from("ticket_types").select("id, code").eq("event_id", eventId);
  const ticketMap = new Map((tickets ?? []).map((ticket) => [ticket.code.toUpperCase(), ticket.id]));
  const inserts = rows.slice(0, 500).map((line) => {
    const [nameRaw, emailRaw, ticketRaw, phoneRaw] = line.split(",").map((item) => item?.trim() ?? "");
    return {
      event_id: eventId,
      attendee_code: "ATT-" + randomBytes(4).toString("hex").toUpperCase(),
      name: nameRaw || "Unnamed attendee",
      email: emailRaw || null,
      ticket_type_id: ticketMap.get((ticketRaw || "GENERAL").toUpperCase()) ?? null,
      phone: phoneRaw || null,
    };
  });
  await supabase.from("attendees").insert(inserts);
  revalidateEvent(eventId);
}

export async function generateWristbands(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const amount = Math.min(Math.max(numberValue(formData, "amount") ?? 1, 1), 250);
  const { supabase } = await managedContext(eventId);
  const { data: last } = await supabase
    .from("qr_credentials")
    .select("display_code")
    .eq("event_id", eventId)
    .not("display_code", "is", null)
    .order("display_code", { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = Number(last?.display_code?.replace(/\D/g, "") || "0") + 1;
  const rows = Array.from({ length: amount }, (_, index) => ({
    event_id: eventId,
    code: randomBytes(24).toString("base64url"),
    display_code: `WR-${String(start + index).padStart(4, "0")}`,
    status: "unclaimed" as const,
  }));
  await supabase.from("qr_credentials").insert(rows);
  revalidateEvent(eventId);
}

export async function revokeCredential(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const credentialId = text(formData, "credentialId", 60);
  const { supabase } = await managedContext(eventId);
  await supabase
    .from("qr_credentials")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", credentialId)
    .eq("event_id", eventId);
  revalidateEvent(eventId);
}

export async function createZone(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return;
  await supabase.from("access_zones").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
  });
  revalidateEvent(eventId);
}

export async function createAccessRule(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const zoneId = text(formData, "zoneId", 60);
  const ticketTypeId = text(formData, "ticketTypeId", 60);
  const allowed = text(formData, "allowed", 10) !== "false";
  const { supabase } = await managedContext(eventId);
  await supabase.from("access_rules").upsert(
    { event_id: eventId, zone_id: zoneId, ticket_type_id: ticketTypeId, allowed },
    { onConflict: "zone_id,ticket_type_id" },
  );
  revalidateEvent(eventId);
}

export async function createStation(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const slug = slugify(text(formData, "slug", 100) || name);
  const mode = text(formData, "mode", 30);
  if (!name || !slug || !["check_in", "zone_access", "activity", "claim"].includes(mode)) return;

  const config: Record<string, string> = {};
  const activityCode = normalizeCode(text(formData, "activityCode", 40));
  const benefitCode = normalizeCode(text(formData, "benefitCode", 40));
  if (activityCode) config.activity_code = activityCode;
  if (benefitCode) config.benefit_code = benefitCode;

  await supabase.from("scanner_stations").insert({
    event_id: eventId,
    zone_id: optionalText(formData, "zoneId", 60),
    name,
    slug,
    mode: mode as "check_in" | "zone_access" | "activity" | "claim",
    config,
    is_active: true,
  });
  revalidateEvent(eventId);
}

export async function toggleStation(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const stationId = text(formData, "stationId", 60);
  const isActive = text(formData, "isActive", 10) === "true";
  const { supabase } = await managedContext(eventId);
  await supabase.from("scanner_stations").update({ is_active: isActive }).eq("id", stationId).eq("event_id", eventId);
  revalidateEvent(eventId);
}

export async function createActivity(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return;
  await supabase.from("activities").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
  });
  revalidateEvent(eventId);
}

export async function createBenefit(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return;
  await supabase.from("benefits").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
    is_active: true,
  });
  revalidateEvent(eventId);
}

export async function saveEventTheme(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const theme = {
    primary: text(formData, "primary", 20) || defaultEventTheme.primary,
    secondary: text(formData, "secondary", 20) || defaultEventTheme.secondary,
    background: text(formData, "background", 20) || defaultEventTheme.background,
    foreground: text(formData, "foreground", 20) || defaultEventTheme.foreground,
    surface: text(formData, "surface", 20) || defaultEventTheme.surface,
  };
  const { data } = await supabase.from("events").update({ theme, updated_at: new Date().toISOString() }).eq("id", eventId).select("slug").single();
  revalidateEvent(eventId, data?.slug);
}

export async function uploadEventAsset(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const assetType = text(formData, "assetType", 20);
  const file = formData.get("file");
  if (!(file instanceof File) || !["logo", "hero", "poster"].includes(assetType)) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) return;

  const { supabase } = await managedContext(eventId);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${eventId}/${assetType}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("event-assets").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return;

  const { data: publicData } = supabase.storage.from("event-assets").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  await supabase.from("event_assets").insert({
    event_id: eventId,
    asset_type: assetType,
    storage_path: path,
    public_url: publicUrl,
  });

  const column = assetType === "logo" ? "logo_url" : assetType === "hero" ? "hero_image_url" : "poster_url";
  const updatePayload: { logo_url?: string; hero_image_url?: string; poster_url?: string; updated_at: string } = { updated_at: new Date().toISOString() };
  updatePayload[column] = publicUrl;
  const { data } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId)
    .select("slug")
    .single();

  revalidateEvent(eventId, data?.slug);
}
