"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { defaultEventTheme } from "@/lib/events";
import type { Json } from "@/lib/supabase/database.types";
import { decryptFigmaToken, encryptFigmaToken, figmaFetch, parseFigmaUrl, refreshFigmaToken } from "@/lib/figma";
import { designKinds, dynamicMarkers, type DynamicMarker, type FigmaElement, type FigmaTemplate } from "@/lib/design-template";

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
  const value = Number(raw.replace(/[^0-9-]/g, ""));
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

function normalizeQrPrefix(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 16);
  return normalized || "WR";
}

function qrDisplayCode(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

function findContiguousQrRange(used: Set<number>, amount: number, preferredStart = 1) {
  let start = Math.max(1, Math.floor(preferredStart));
  const maxStart = Math.max(start + 50000, ...used, 0) + amount + 1;
  while (start <= maxStart) {
    let available = true;
    for (let offset = 0; offset < amount; offset += 1) {
      if (used.has(start + offset)) {
        start += offset + 1;
        available = false;
        break;
      }
    }
    if (available) return start;
  }
  return Math.max(1, preferredStart);
}

type QrBatchInput = {
  eventId: string;
  prefix?: string;
  amount?: number;
  startNumber?: number | null;
  mode?: "auto" | "custom";
};

async function resolveQrBatch(input: QrBatchInput) {
  const eventId = String(input.eventId || "").slice(0, 60);
  const prefix = normalizeQrPrefix(String(input.prefix || "WR"));
  const amount = Math.min(Math.max(Math.floor(Number(input.amount) || 1), 1), 250);
  const mode: "auto" | "custom" = input.mode === "custom" ? "custom" : "auto";
  const requestedStart =
    mode === "custom" && Number.isFinite(Number(input.startNumber))
      ? Math.max(1, Math.floor(Number(input.startNumber)))
      : 1;
  const { supabase } = await managedContext(eventId);
  const { data, error } = await supabase
    .from("qr_credentials")
    .select("display_code")
    .eq("event_id", eventId)
    .like("display_code", `${prefix}-%`);

  if (error) {
    return { ok: false as const, message: "The QR code could not be validated." };
  }

  const used = new Set<number>();
  for (const row of data ?? []) {
    const value = row.display_code;
    if (!value || !value.startsWith(prefix + "-")) continue;
    const suffix = value.slice(prefix.length + 1);
    if (/^\d+$/.test(suffix)) used.add(Number(suffix));
  }

  const requestedAvailable =
    mode !== "custom" ||
    Array.from({ length: amount }, (_, index) => requestedStart + index).every(
      (number) => !used.has(number),
    );
  const start = requestedAvailable
    ? mode === "custom"
      ? requestedStart
      : findContiguousQrRange(used, amount, 1)
    : findContiguousQrRange(used, amount, requestedStart);

  return {
    ok: true as const,
    eventId,
    prefix,
    amount,
    mode,
    requestedStart,
    requestedAvailable,
    start,
    end: start + amount - 1,
    firstCode: qrDisplayCode(prefix, start),
    lastCode: qrDisplayCode(prefix, start + amount - 1),
    usedCount: used.size,
    supabase,
  };
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
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/people`);
  revalidatePath(`/admin/events/${eventId}/access`);
  revalidatePath(`/admin/events/${eventId}/experience`);
  revalidatePath(`/admin/events/${eventId}/settings`);
  revalidatePath(`/admin/events/${eventId}/appearance`);
  if (slug) {
    revalidatePath(`/e/${slug}`);
    revalidatePath(`/e/${slug}/claim`);
  }
}

export async function createEvent(formData: FormData) {
  const { supabase, membership, user } = await managedContext();
  const name = text(formData, "name", 120);
  const slug = slugify(text(formData, "slug", 100) || name);
  if (name.length < 2 || !slug) redirect("/admin/events/new?error=invalid");

  const startsAt = optionalText(formData, "startsAt", 40);
  const endsAt = optionalText(formData, "endsAt", 40);
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: membership.organization_id,
      created_by: user.id,
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
  const { error } = await supabase.rpc("stage_event_config", { p_event_id: eventId, p_patch: {
      name,
      slug,
      description: optionalText(formData, "description", 1200),
      venue: optionalText(formData, "venue", 160),
      starts_at: startsAt && !Number.isNaN(Date.parse(startsAt)) ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt && !Number.isNaN(Date.parse(endsAt)) ? new Date(endsAt).toISOString() : null,
      capacity: numberValue(formData, "capacity"),
    } });
  if (error) redirect(`/admin/events/${eventId}/settings?error=save`);
  revalidateEvent(eventId, slug);
}

export async function setEventStatus(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const action = text(formData, "action", 20);
  if (!["publish", "archive", "reopen", "restore"].includes(action)) return;
  const { supabase } = await managedContext(eventId);
  const { data: current } = await supabase.from("events").select("slug").eq("id", eventId).single();
  const version = Number(text(formData, "version", 12));
  const { error } = await supabase.rpc("transition_event", {
    p_event_id: eventId, p_action: action, p_version: action === "restore" && Number.isInteger(version) && version > 0 ? version : null,
  });
  if (error) {
    const reason = ["incomplete_event_configuration", "ticket_required_to_publish", "capacity_below_registration", "claim_mode_locked_after_registration", "no_draft_changes", "version_not_found"].find(code => error.message.includes(code)) ?? "transition";
    redirect(`/admin/events/${eventId}/settings?error=${reason}`);
  }
  revalidateEvent(eventId, current?.slug);
  const { data: updated } = await supabase.from("events").select("slug").eq("id", eventId).single();
  if (updated?.slug !== current?.slug) revalidateEvent(eventId, updated?.slug);
}

export async function deleteEvent(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const confirmation = text(formData, "confirmation", 100);
  const { supabase } = await managedContext(eventId);
  const { data: event } = await supabase.from("events").select("slug,status").eq("id", eventId).single();
  if (!event || confirmation !== event.slug) return;
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) redirect(`/admin/events/${eventId}/settings?error=delete`);
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
    price: numberValue(formData, "price") ?? 0,
    currency: text(formData, "currency", 8) || "IDR",
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

export async function checkQrCodeAvailability(input: QrBatchInput) {
  const resolved = await resolveQrBatch(input);
  if (!resolved.ok) return resolved;
  return {
    ok: true as const,
    eventId: resolved.eventId,
    prefix: resolved.prefix,
    amount: resolved.amount,
    mode: resolved.mode,
    requestedStart: resolved.requestedStart,
    requestedAvailable: resolved.requestedAvailable,
    start: resolved.start,
    end: resolved.end,
    firstCode: resolved.firstCode,
    lastCode: resolved.lastCode,
    usedCount: resolved.usedCount,
  };
}

export async function generateQrBatch(input: QrBatchInput) {
  const resolved = await resolveQrBatch(input);
  if (!resolved.ok) return resolved;

  if (resolved.mode === "custom" && !resolved.requestedAvailable) {
    return {
      ok: false as const,
      conflict: true as const,
      message: `The selected range is already in use. The next available range is ${resolved.firstCode} – ${resolved.lastCode}.`,
      firstCode: resolved.firstCode,
      lastCode: resolved.lastCode,
      start: resolved.start,
      end: resolved.end,
    };
  }

  const rows = Array.from({ length: resolved.amount }, (_, index) => ({
    event_id: resolved.eventId,
    code: randomBytes(24).toString("base64url"),
    display_code: qrDisplayCode(resolved.prefix, resolved.start + index),
    status: "unclaimed" as const,
  }));

  const { error } = await resolved.supabase.from("qr_credentials").insert(rows);
  if (error) {
    const retry = await resolveQrBatch({ ...input, mode: "auto", startNumber: null });
    return {
      ok: false as const,
      conflict: true as const,
      message:
        retry.ok
          ? `The range changed during generation. Try ${retry.firstCode} – ${retry.lastCode}.`
          : "The QR batch could not be created. Check availability again.",
    };
  }

  revalidateEvent(resolved.eventId);
  return {
    ok: true as const,
    message: `${resolved.amount} QR credentials created successfully.`,
    prefix: resolved.prefix,
    start: resolved.start,
    end: resolved.end,
    firstCode: resolved.firstCode,
    lastCode: resolved.lastCode,
  };
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
  if (!name || !code) return { error: "Name and a valid code are required." };
  const { error } = await supabase.from("access_zones").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
  });
  if (error) return { error: error.code === "23505" ? "This code already exists. Choose a unique code." : "The record could not be saved. Review the configuration and try again." };
  revalidateEvent(eventId);
}

export async function createAccessRule(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const zoneId = text(formData, "zoneId", 60);
  const ticketTypeId = text(formData, "ticketTypeId", 60);
  const allowed = text(formData, "allowed", 10) !== "false";
  const { supabase } = await managedContext(eventId);
  const [zone, ticket] = await Promise.all([
    supabase.from("access_zones").select("id").eq("event_id",eventId).eq("id",zoneId).maybeSingle(),
    supabase.from("ticket_types").select("id").eq("event_id",eventId).eq("id",ticketTypeId).maybeSingle(),
  ]);
  if (!zone.data || !ticket.data) return { error: "Select a zone and pass category belonging to this event." };
  const { error } = await supabase.from("access_rules").upsert(
    { event_id: eventId, zone_id: zoneId, ticket_type_id: ticketTypeId, allowed },
    { onConflict: "zone_id,ticket_type_id" },
  );
  if (error) return { error: error.code === "23505" ? "This code already exists. Choose a unique code." : "The record could not be saved. Review the configuration and try again." };
  revalidateEvent(eventId);
}

export async function createStation(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const slug = slugify(text(formData, "slug", 100) || name);
  const mode = text(formData, "mode", 30);
  if (!name || !slug || !["check_in", "zone_access", "activity", "claim"].includes(mode)) return { error: "Choose a valid name and scanner mode." };

  const config: Record<string, string> = {};
  const activityCode = normalizeCode(text(formData, "activityCode", 40));
  const benefitCode = normalizeCode(text(formData, "benefitCode", 40));
  if (activityCode) config.activity_code = activityCode;
  if (benefitCode) config.benefit_code = benefitCode;

  const zoneId = optionalText(formData, "zoneId", 60);
  if (zoneId) {
    const { data } = await supabase.from("access_zones").select("id").eq("event_id", eventId).eq("id", zoneId).eq("is_active", true).maybeSingle();
    if (!data) return { error: "Choose a zone belonging to this event." };
  }
  if (mode === "zone_access" && !zoneId) return { error: "Choose an access zone." };
  if (mode === "activity") {
    const { data } = await supabase.from("activities").select("id").eq("event_id", eventId).eq("code", activityCode).eq("is_active", true).maybeSingle();
    if (!data) return { error: "Enter an existing activity code from this event." };
  }
  if (mode === "claim") {
    const { data } = await supabase.from("benefits").select("id").eq("event_id", eventId).eq("code", benefitCode).eq("is_active", true).maybeSingle();
    if (!data) return { error: "Enter an active benefit code from this event." };
  }
  const { error } = await supabase.from("scanner_stations").insert({
    event_id: eventId,
    zone_id: optionalText(formData, "zoneId", 60),
    name,
    slug,
    mode: mode as "check_in" | "zone_access" | "activity" | "claim",
    config,
    is_active: true,
  });
  if (error) return { error: error.code === "23505" ? "This code already exists. Choose a unique code." : "The record could not be saved. Review the configuration and try again." };
  revalidateEvent(eventId);
}

export async function createActivity(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return { error: "Name and a valid code are required." };
  const { error } = await supabase.from("activities").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
  });
  if (error) return { error: error.code === "23505" ? "This code already exists. Choose a unique code." : "The record could not be saved. Review the configuration and try again." };
  revalidateEvent(eventId);
}

export async function createBenefit(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const name = text(formData, "name", 100);
  const code = normalizeCode(text(formData, "code", 40) || name);
  if (!name || !code) return { error: "Name and a valid code are required." };
  const { error } = await supabase.from("benefits").insert({
    event_id: eventId,
    name,
    code,
    description: optionalText(formData, "description", 500),
    is_active: true,
  });
  if (error) return { error: error.code === "23505" ? "This code already exists. Choose a unique code." : "The record could not be saved. Review the configuration and try again." };
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
    headerStyle: ["minimal", "editorial", "split"].includes(text(formData, "headerStyle", 20)) ? text(formData, "headerStyle", 20) : defaultEventTheme.headerStyle,
  };
  if ([theme.primary, theme.secondary, theme.background, theme.foreground, theme.surface].some(value => !/^#[0-9a-f]{6}$/i.test(value))) {
    return { ok: false, message: "Invalid color value. Use a 6-digit HEX code." };
  }
  const { error } = await supabase.rpc("stage_event_config", { p_event_id: eventId, p_patch: { theme } });
  if (error) return { ok: false, message: "Appearance settings could not be saved. Please try again." };
  revalidateEvent(eventId);
  return { ok: true, message: "Appearance saved to draft. Publish in Settings to update the live event." };
}

export async function saveEventQrConfig(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const allowed = ["digital", "id_card_portrait", "id_card_landscape", "wristband"] as const;
  const modeValue = text(formData, "mode", 30);
  const mode = allowed.includes(modeValue as (typeof allowed)[number]) ? modeValue : "digital";
  const clamp = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(text(formData, key, 20).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };
  const [{ data: current, error: readError }, { data: draft }] = await Promise.all([
    supabase.from("events").select("qr_config,slug").eq("id", eventId).single(),
    supabase.from("event_config_drafts").select("config").eq("event_id", eventId).maybeSingle(),
  ]);
  if (readError || !current) return { ok: false, message: "Pass configuration could not be loaded. Please try again." };
  const effective = draft?.config && typeof draft.config === "object" && !Array.isArray(draft.config) ? draft.config.qr_config : current.qr_config;
  const existing = effective && typeof effective === "object" && !Array.isArray(effective) ? effective as Record<string, unknown> : {};
  const { error } = await supabase.rpc("stage_event_config", { p_event_id: eventId, p_patch: {
    qr_config: {
      ...existing,
      mode,
      claim_mode:
        existing.claim_mode === "claim" || existing.claim_mode === "automatic"
          ? existing.claim_mode
          : mode === "wristband"
            ? "claim"
            : "automatic",
      template_url: typeof existing.template_url === "string" ? existing.template_url : null,
      width_mm: clamp("widthMm", 85.6, 20, 500),
      height_mm: clamp("heightMm", 54, 20, 500),
      qr_x: clamp("qrX", 68, 0, 100),
      qr_y: clamp("qrY", 50, 0, 100),
      qr_size: clamp("qrSize", 22, 5, 80),
    },
  } as Json });
  if (error) return { ok: false, message: error.message.includes("claim_mode_locked") ? "Claim mode cannot change after attendees have registered." : "QR settings could not be saved. Please try again." };
  revalidateEvent(eventId, current?.slug);
  return { ok: true, message: "Pass and QR settings saved to draft. Publish in Settings to update the live event." };
}

export async function saveClaimMode(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const claimMode = text(formData, "claimMode", 20) === "claim" ? "claim" : "automatic";
  const { supabase } = await managedContext(eventId);

  const [{ data: current }, { data: draft }] = await Promise.all([
    supabase.from("events").select("qr_config,slug,status").eq("id", eventId).single(),
    supabase.from("event_config_drafts").select("config").eq("event_id", eventId).maybeSingle(),
  ]);
  if (!current) return;

  const effective = draft?.config && typeof draft.config === "object" && !Array.isArray(draft.config) ? draft.config.qr_config : current.qr_config;
  const existing =
    effective && typeof effective === "object" && !Array.isArray(effective)
      ? (effective as Record<string, unknown>)
      : {};

  const { error: stagedError } = await supabase.rpc("stage_event_config", { p_event_id: eventId,
    p_patch: { qr_config: { ...existing, claim_mode: claimMode } as Json } });
  if (stagedError) redirect(`/admin/events/${eventId}/access?error=claim_mode_locked`);

  if (claimMode === "automatic" && current.status === "draft") {
    const attendees: Array<{ id: string; attendee_code: string }> = [];
    for (let from = 0; ; from += 500) {
      const { data } = await supabase
        .from("attendees")
        .select("id,attendee_code")
        .eq("event_id", eventId)
        .order("created_at")
        .range(from, from + 499);
      const page = data ?? [];
      attendees.push(...page);
      if (page.length < 500) break;
    }

    const activeIds = new Set<string>();
    for (let from = 0; ; from += 500) {
      const { data } = await supabase
        .from("qr_credentials")
        .select("attendee_id")
        .eq("event_id", eventId)
        .eq("status", "active")
        .not("attendee_id", "is", null)
        .range(from, from + 499);
      const page = data ?? [];
      for (const item of page) {
        if (item.attendee_id) activeIds.add(item.attendee_id);
      }
      if (page.length < 500) break;
    }

    const missing = attendees.filter((attendee) => !activeIds.has(attendee.id));
    const now = new Date().toISOString();
    for (let index = 0; index < missing.length; index += 200) {
      const rows = missing.slice(index, index + 200).map((attendee) => ({
        event_id: eventId,
        attendee_id: attendee.id,
        code: randomBytes(24).toString("base64url"),
        display_code: `PASS-${randomBytes(6).toString("hex").toUpperCase()}`,
        status: "active" as const,
        claimed_at: now,
      }));
      if (rows.length) {
        await supabase.from("qr_credentials").insert(rows);
      }
    }
  }

  revalidateEvent(eventId, current.slug);
}

export async function uploadEventAsset(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const assetType = text(formData, "assetType", 20);
  const file = formData.get("file");

  if (!eventId || !["logo", "hero", "poster", "qr_template"].includes(assetType)) {
    return { ok: false, message: "The asset or event is invalid." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file before uploading." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Use a JPG, PNG, or WEBP image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "The maximum file size is 5 MB." };
  }

  const { supabase } = await managedContext(eventId);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${eventId}/${assetType}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("event-assets").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
  if (uploadError) {
    return { ok: false, message: `Upload failed: ${uploadError.message}` };
  }

  const { data: publicData } = supabase.storage.from("event-assets").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const { error: assetError } = await supabase.from("event_assets").insert({
    event_id: eventId,
    asset_type: assetType,
    storage_path: path,
    public_url: publicUrl,
  });

  if (assetError) {
    await supabase.storage.from("event-assets").remove([path]).catch(() => undefined);
    return { ok: false, message: "The file was uploaded, but its asset metadata could not be saved." };
  }

  if (assetType === "qr_template") {
    const [{ data: current }, { data: draft }] = await Promise.all([
      supabase.from("events").select("qr_config,slug").eq("id", eventId).single(),
      supabase.from("event_config_drafts").select("config").eq("event_id", eventId).maybeSingle(),
    ]);
    const effective = draft?.config && typeof draft.config === "object" && !Array.isArray(draft.config) ? draft.config.qr_config : current?.qr_config;
    const existing =
      effective && typeof effective === "object" && !Array.isArray(effective)
        ? (effective as Record<string, unknown>)
        : {};
    const { error: updateError } = await supabase.rpc("stage_event_config", { p_event_id: eventId,
      p_patch: { qr_config: { ...existing, template_url: publicUrl } as Json } });

    if (updateError) {
      return { ok: false, message: "The template was uploaded, but the event could not be updated." };
    }
    revalidateEvent(eventId, current?.slug);
    return { ok: true, message: "QR template updated successfully.", publicUrl };
  }

  const column =
    assetType === "logo" ? "logo_url" : assetType === "hero" ? "hero_image_url" : "poster_url";
  const { error: eventError } = await supabase.rpc("stage_event_config", { p_event_id: eventId,
    p_patch: { [column]: publicUrl } });

  if (eventError) {
    return { ok: false, message: "The asset was uploaded, but the event could not be updated." };
  }

  revalidateEvent(eventId);
  return {
    ok: true,
    message:
      assetType === "hero"
        ? "Event banner updated successfully."
        : assetType === "logo"
          ? "Logo updated successfully."
          : "Poster updated successfully.",
    publicUrl,
  };
}


export async function createCrewInvitation(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const { supabase } = await managedContext(eventId);
  const token = randomBytes(24).toString("base64url");
  const { data } = await supabase.from("event_invitations").insert({ event_id: eventId, token, job_title: text(formData, "jobTitle", 80) || "Crew", access_role: text(formData, "accessRole", 20) || "crew", invited_email: optionalText(formData, "email", 254) }).select("token").single();
  if (!data) return;
  revalidateEvent(eventId);
  redirect(`/admin/events/${eventId}/people?invite=${encodeURIComponent(data.token)}`);
}

export async function revokeCrew(formData: FormData) {
  const eventId = text(formData, "eventId", 60); const userId = text(formData, "userId", 60);
  const { supabase } = await managedContext(eventId);
  await supabase.from("event_members").update({ status: "revoked" }).eq("event_id", eventId).eq("user_id", userId);
  revalidateEvent(eventId);
}

export async function syncFigmaDesign(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const assetType = text(formData, "assetType", 30);
  const name = text(formData, "name", 120);
  const figmaUrl = text(formData, "figmaUrl", 500);
  if (!eventId || !name || !figmaUrl || !designKinds.some((item) => item.value === assetType)) return;
  const { supabase, user } = await managedContext(eventId);
  const ticketTypeId = optionalText(formData, "ticketTypeId", 60);
  if (assetType === "event_page" && ticketTypeId) redirect(`/admin/events/${eventId}/design?error=invalid_ticket_type`);
  if (ticketTypeId) {
    const { data: ticketType } = await supabase.from("ticket_types").select("id").eq("id", ticketTypeId).eq("event_id", eventId).maybeSingle();
    if (!ticketType) redirect(`/admin/events/${eventId}/design?error=invalid_ticket_type`);
  }
  const { data: connection, error: connectionError } = await supabase.from("figma_connections")
    .select("access_token_encrypted,refresh_token_encrypted,expires_at").eq("user_id", user.id).maybeSingle();
  if (connectionError) redirect(`/admin/events/${eventId}/design?error=figma_sync_failed`);
  if (!connection) redirect(`/admin/events/${eventId}/design?error=figma_not_connected`);
  try {
    let token = decryptFigmaToken(connection.access_token_encrypted);
    if (new Date(connection.expires_at).getTime() < Date.now() + 300_000) {
      const refreshed = await refreshFigmaToken(decryptFigmaToken(connection.refresh_token_encrypted));
      if (!refreshed.access_token || !refreshed.expires_in) throw new Error("Figma refresh failed");
      token = refreshed.access_token;
      const { error: refreshError } = await supabase.from("figma_connections").update({
        access_token_encrypted: encryptFigmaToken(token),
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      if (refreshError) throw refreshError;
    }
    const parsed = parseFigmaUrl(figmaUrl);
    const nodeId = parsed.nodeId?.replace(/-/g, ":") ?? null;
    if (!nodeId) throw new Error("Select a frame and use its Figma selection URL.");
    const query = `?ids=${encodeURIComponent(nodeId)}&depth=10`;
    type FigmaColor = { r?: number; g?: number; b?: number; a?: number };
    type FigmaNode = { id?: string; name?: string; type?: string; absoluteBoundingBox?: { x?: number; y?: number; width?: number; height?: number }; fills?: { type?: string; color?: FigmaColor; opacity?: number }[]; style?: { fontSize?: number; fontFamily?: string; fontWeight?: number; textAlignHorizontal?: string }; cornerRadius?: number; children?: FigmaNode[] };
    const file = await figmaFetch<{ name: string; version?: string; lastModified?: string; thumbnailUrl?: string; document?: FigmaNode }>(token, `/files/${parsed.fileKey}${query}`);
    const find = (root: FigmaNode | undefined, predicate: (node: FigmaNode) => boolean): FigmaNode | null => { if (!root) return null; if (predicate(root)) return root; for (const child of root.children ?? []) { const match = find(child, predicate); if (match) return match; } return null; };
    const frameNode = find(file.document, (node) => node.id === nodeId) ?? file.document;
    const bounds = frameNode?.absoluteBoundingBox;
    if (!bounds?.width || !bounds.height) throw new Error("The Figma frame dimensions could not be read.");
    const marker = optionalText(formData, "qrMarker", 80) || "PASSFLOW_QR";
    const markerName = (node: FigmaNode): DynamicMarker | null => {
      const name = (node.name ?? "").trim().toUpperCase();
      const match = (Object.keys(dynamicMarkers) as DynamicMarker[]).find((key) => {
        const shortName = key.replace("PASSFLOW_", "").toLowerCase();
        return name === key || name.includes(`{{${key}}}`) || name.includes(`{{PASSFLOW.${shortName.toUpperCase()}}}`);
      });
      if (match) return match;
      return name === marker.toUpperCase() ? "PASSFLOW_QR" : null;
    };
    const walk = (root: FigmaNode | undefined): FigmaNode[] => root ? [root, ...(root.children ?? []).flatMap((child) => walk(child))] : [];
    const colorHex = (color: FigmaColor | undefined) => color && [color.r, color.g, color.b].every((channel) => typeof channel === "number")
      ? `#${[color.r, color.g, color.b].map((channel) => Math.round(Math.max(0, Math.min(1, channel!)) * 255).toString(16).padStart(2, "0")).join("")}`
      : null;
    const detected: FigmaElement[] = walk(frameNode).flatMap((node) => {
      const kind = markerName(node), b = node.absoluteBoundingBox;
      if (!kind || !node.id || !b?.width || !b.height) return [];
      const fill = node.type === "TEXT" ? undefined : node.fills?.find((item) => item.type === "SOLID" && (item.opacity ?? item.color?.a ?? 1) > 0.95);
      const textColor = node.type === "TEXT" ? node.fills?.find((item) => item.type === "SOLID") : node.children?.flatMap((child) => child.fills ?? []).find((item) => item.type === "SOLID");
      const style = node.style ?? node.children?.find((child) => child.style)?.style;
      return [{ nodeId: node.id, name: node.name ?? kind, marker: kind, field: dynamicMarkers[kind], nodeType: node.type ?? "UNKNOWN",
        x: (b.x ?? 0) - (bounds.x ?? 0), y: (b.y ?? 0) - (bounds.y ?? 0), width: b.width, height: b.height,
        fill: fill ? colorHex(fill.color) : null, fontSize: style?.fontSize ?? null,
        fontColor: colorHex(textColor?.color) ?? null, fontFamily: style?.fontFamily ?? null,
        fontWeight: style?.fontWeight ?? null, textAlign: style?.textAlignHorizontal ?? null, cornerRadius: node.cornerRadius ?? null }];
    }).slice(0, 60);
    const qrNode = detected.find((node) => node.marker === "PASSFLOW_QR");
    const qrBounds = qrNode ? { width: qrNode.width, height: qrNode.height } : null;
    const qrWidth = qrBounds?.width ?? 0, qrHeight = qrBounds?.height ?? 0;
    const template: FigmaTemplate = { source: "figma", unit: "px", frame: { x: 0, y: 0, width: bounds.width, height: bounds.height }, frameNodeId: nodeId, qrMarker: marker, hasQr: !!qrBounds, elements: detected,
      qrPlaceholder: qrBounds && qrNode?.nodeId ? { nodeId: qrNode.nodeId, name: qrNode.name ?? marker, x: qrNode.x, y: qrNode.y, width: qrWidth, height: qrHeight } : null,
      qrStyle: { foreground: text(formData, "qrForeground", 7) || "#111111", background: text(formData, "qrBackground", 7) || "#ffffff", modules: (["square", "rounded", "dots"].includes(text(formData, "qrModules", 12)) ? text(formData, "qrModules", 12) : "square") as "square" | "rounded" | "dots" } };
    let previewUrl: string | null = file.thumbnailUrl ?? null;
    if (nodeId) {
      const images = await figmaFetch<{ images?: Record<string, string> }>(token, `/images/${parsed.fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`);
      previewUrl = images.images?.[nodeId] ?? null;
    }
    const payload = { status: "draft", event_id: eventId, created_by: user.id, kind: assetType, name, figma_file_key: parsed.fileKey, figma_node_id: nodeId, figma_file_url: figmaUrl, figma_file_name: file.name ?? null, figma_version: file.version ?? null, preview_url: previewUrl, template, ticket_type_id: ticketTypeId, metadata: { lastModified: file.lastModified ?? null, frame: template.frame, elements: template.elements, qrPlaceholder: template.qrPlaceholder, qrMarker: template.qrMarker }, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const result = await supabase.from("event_designs").insert(payload).select("id").single();
    if (result.error || !result.data) throw result.error ?? new Error("Design was not saved");
  } catch {
    redirect(`/admin/events/${eventId}/design?error=figma_sync_failed`);
  }
  revalidatePath(`/admin/events/${eventId}/design`);
  redirect(`/admin/events/${eventId}/design?synced=1`);
}

export async function deleteFigmaDesign(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const designId = text(formData, "designId", 60);
  if (!eventId || !designId) return;
  const { supabase } = await managedContext(eventId);
  const { error } = await supabase.from("event_designs").delete().eq("id", designId).eq("event_id", eventId).eq("status", "draft");
  if (error) redirect(`/admin/events/${eventId}/design?error=figma_sync_failed`);
  revalidatePath(`/admin/events/${eventId}/design`);
}
