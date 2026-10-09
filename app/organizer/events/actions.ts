"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { canCreateEvent } from "@/lib/organizer-quota";
import { defaultEventTheme } from "@/lib/events";
import type { Json } from "@/lib/supabase/database.types";

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
  const context = await requireOrganizerMembership(eventId ? `/organizer/events/${eventId}` : "/organizer/events");
  if (eventId) {
    const { data: allowed, error } = await context.supabase.rpc("is_event_manager", {
      p_event_id: eventId,
    });
    if (error || !allowed) redirect("/unauthorized");
  }
  return context;
}

function revalidateEvent(eventId: string, slug?: string | null) {
  revalidatePath("/organizer/events");
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath(`/organizer/events/${eventId}`);
  revalidatePath(`/organizer/events/${eventId}/people`);
  revalidatePath(`/organizer/events/${eventId}/access`);
  revalidatePath(`/organizer/events/${eventId}/experience`);
  revalidatePath(`/organizer/events/${eventId}/settings`);
  if (slug) {
    revalidatePath(`/e/${slug}`);
    revalidatePath(`/e/${slug}/claim`);
  }
}

export async function createEvent(formData: FormData) {
  const { supabase, membership, user } = await managedContext();
  if (!(await canCreateEvent(supabase, user))) redirect("/organizer/events/new?error=limit");
  const name = text(formData, "name", 120);
  const slug = slugify(text(formData, "slug", 100) || name);
  if (name.length < 2 || !slug) redirect("/organizer/events/new?error=invalid");

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

  if (error || !data) redirect("/organizer/events/new?error=create");
  revalidatePath("/organizer/events");
  redirect(`/organizer/events/${data.id}`);
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
  if (error) redirect(`/organizer/events/${eventId}/settings?error=save`);
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
    redirect(`/organizer/events/${eventId}/settings?error=${reason}`);
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
  if (error) redirect(`/organizer/events/${eventId}/settings?error=delete`);
  revalidatePath("/organizer/events");
  redirect("/organizer/events");
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
      message: `The selected range is already in use. The next available range is ${resolved.firstCode} to ${resolved.lastCode}.`,
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
          ? `The range changed during generation. Try ${retry.firstCode} to ${retry.lastCode}.`
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

// Revoke keeps the audit trail; delete only removes codes nobody has claimed yet (printed by mistake, damaged).
export async function manageCredentials(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const operation = text(formData, "operation", 10);
  const ids = formData.getAll("credentialId").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 1000);
  if (!ids.length || !["revoke", "delete"].includes(operation)) return { error: "Select at least one QR code." };
  const { supabase } = await managedContext(eventId);
  if (operation === "delete") {
    const { data, error } = await supabase.rpc("delete_unclaimed_credentials", { p_event_id: eventId, p_ids: ids });
    if (error) return { error: "QR codes could not be deleted. Try again." };
    revalidateEvent(eventId);
    const kept = ids.length - (data ?? 0);
    return { message: `${data ?? 0} deleted.${kept ? ` ${kept} claimed or revoked code${kept === 1 ? " was" : "s were"} kept for the audit trail; revoke instead.` : ""}` };
  }
  const { data, error } = await supabase
    .from("qr_credentials")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .in("id", ids)
    .in("status", ["active", "unclaimed"])
    .select("id");
  if (error) return { error: "QR codes could not be revoked. Try again." };
  revalidateEvent(eventId);
  return { message: `${data.length} revoked. They no longer open any gate.` };
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
    tagline: text(formData, "tagline", 60).replace(/\s+/g, " "),
    ctaLabel: text(formData, "ctaLabel", 28).replace(/\s+/g, " "),
    font: ["sans", "serif", "mono"].includes(text(formData, "font", 10)) ? text(formData, "font", 10) : "sans",
    corners: ["rounded", "soft", "sharp"].includes(text(formData, "corners", 10)) ? text(formData, "corners", 10) : "rounded",
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
    },
  } as Json });
  if (error) return { ok: false, message: error.message.includes("claim_mode_locked") ? "Claim mode cannot change after attendees have registered." : "QR settings could not be saved. Please try again." };
  revalidateEvent(eventId, current?.slug);
  return { ok: true, message: "Format saved to draft. Publish in Settings to update the live event." };
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
  if (stagedError) redirect(`/organizer/events/${eventId}/access?error=claim_mode_locked`);

  if (claimMode === "automatic" && current.status === "draft") {
    const attendees: Array<{ id: string; attendee_code: string }> = [];
    for (let from = 0; ; from += 500) {
      const { data } = await supabase
        .from("attendees")
        .select("id,attendee_code")
        .eq("event_id", eventId)
        .is("deleted_at", null)
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

  if (!eventId || !["logo", "hero", "poster"].includes(assetType)) {
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
  redirect(`/organizer/events/${eventId}/people?invite=${encodeURIComponent(data.token)}`);
}

export async function revokeCrew(formData: FormData) {
  const eventId = text(formData, "eventId", 60); const userId = text(formData, "userId", 60);
  const { supabase } = await managedContext(eventId);
  await supabase.from("event_members").update({ status: "revoked" }).eq("event_id", eventId).eq("user_id", userId);
  revalidateEvent(eventId);
}

