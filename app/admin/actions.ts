"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { defaultEventTheme } from "@/lib/events";
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
    headerStyle: ["minimal", "editorial", "split"].includes(text(formData, "headerStyle", 20)) ? text(formData, "headerStyle", 20) : defaultEventTheme.headerStyle,
  };
  const { data } = await supabase.from("events").update({ theme, updated_at: new Date().toISOString() }).eq("id", eventId).select("slug").single();
  revalidateEvent(eventId, data?.slug);
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
  const { data: current } = await supabase.from("events").select("qr_config,slug").eq("id", eventId).single();
  const existing = current?.qr_config && typeof current.qr_config === "object" && !Array.isArray(current.qr_config) ? current.qr_config as Record<string, unknown> : {};
  await supabase.from("events").update({
    qr_config: {
      mode,
      template_url: typeof existing.template_url === "string" ? existing.template_url : null,
      width_mm: clamp("widthMm", 85.6, 20, 500),
      height_mm: clamp("heightMm", 54, 20, 500),
      qr_x: clamp("qrX", 68, 0, 100),
      qr_y: clamp("qrY", 50, 0, 100),
      qr_size: clamp("qrSize", 22, 5, 80),
    },
    updated_at: new Date().toISOString(),
  }).eq("id", eventId);
  revalidateEvent(eventId, current?.slug);
}

export async function uploadEventAsset(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const assetType = text(formData, "assetType", 20);
  const file = formData.get("file");

  if (!eventId || !["logo", "hero", "poster", "qr_template"].includes(assetType)) {
    return { ok: false, message: "Asset atau event tidak valid." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pilih file gambar terlebih dahulu." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Format harus JPG, PNG, atau WEBP." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Ukuran file maksimal 5 MB." };
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
    return { ok: false, message: `Upload gagal: ${uploadError.message}` };
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
    return { ok: false, message: "File terunggah, tetapi metadata asset gagal disimpan." };
  }

  if (assetType === "qr_template") {
    const { data: current } = await supabase
      .from("events")
      .select("qr_config,slug")
      .eq("id", eventId)
      .single();
    const existing =
      current?.qr_config && typeof current.qr_config === "object" && !Array.isArray(current.qr_config)
        ? (current.qr_config as Record<string, unknown>)
        : {};
    const { error: updateError } = await supabase
      .from("events")
      .update({
        qr_config: { ...existing, template_url: publicUrl },
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (updateError) {
      return { ok: false, message: "Template terunggah, tetapi event belum berhasil diperbarui." };
    }
    revalidateEvent(eventId, current?.slug);
    return { ok: true, message: "Template QR berhasil diperbarui.", publicUrl };
  }

  const column =
    assetType === "logo" ? "logo_url" : assetType === "hero" ? "hero_image_url" : "poster_url";
  const updatePayload: {
    logo_url?: string;
    hero_image_url?: string;
    poster_url?: string;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  updatePayload[column] = publicUrl;

  const { data, error: eventError } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId)
    .select("slug")
    .single();

  if (eventError) {
    return { ok: false, message: "Asset terunggah, tetapi event belum berhasil diperbarui." };
  }

  revalidateEvent(eventId, data?.slug);
  return {
    ok: true,
    message:
      assetType === "hero"
        ? "Hero image berhasil diperbarui."
        : assetType === "logo"
          ? "Logo berhasil diperbarui."
          : "Poster berhasil diperbarui.",
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
  redirect(`/admin/events/${eventId}?invite=${encodeURIComponent(data.token)}`);
}

export async function revokeCrew(formData: FormData) {
  const eventId = text(formData, "eventId", 60); const userId = text(formData, "userId", 60);
  const { supabase } = await managedContext(eventId);
  await supabase.from("event_members").update({ status: "revoked" }).eq("event_id", eventId).eq("user_id", userId);
  revalidateEvent(eventId);
}

export async function syncFigmaDesign(formData: FormData) {
  const eventId = text(formData, "eventId", 60);
  const designId = optionalText(formData, "designId", 60);
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
    if (!nodeId) throw new Error("Pilih frame dan gunakan URL selection dari Figma.");
    const query = `?ids=${encodeURIComponent(nodeId)}&depth=10`;
    type FigmaColor = { r?: number; g?: number; b?: number; a?: number };
    type FigmaNode = { id?: string; name?: string; type?: string; absoluteBoundingBox?: { x?: number; y?: number; width?: number; height?: number }; fills?: { type?: string; color?: FigmaColor; opacity?: number }[]; style?: { fontSize?: number; fontFamily?: string; fontWeight?: number; textAlignHorizontal?: string }; cornerRadius?: number; children?: FigmaNode[] };
    const file = await figmaFetch<{ name: string; version?: string; lastModified?: string; thumbnailUrl?: string; document?: FigmaNode }>(token, `/files/${parsed.fileKey}${query}`);
    const find = (root: FigmaNode | undefined, predicate: (node: FigmaNode) => boolean): FigmaNode | null => { if (!root) return null; if (predicate(root)) return root; for (const child of root.children ?? []) { const match = find(child, predicate); if (match) return match; } return null; };
    const frameNode = find(file.document, (node) => node.id === nodeId) ?? file.document;
    const bounds = frameNode?.absoluteBoundingBox;
    if (!bounds?.width || !bounds.height) throw new Error("Ukuran frame Figma tidak terbaca.");
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
    const payload = { event_id: eventId, created_by: user.id, kind: assetType, name, figma_file_key: parsed.fileKey, figma_node_id: nodeId, figma_file_url: figmaUrl, figma_file_name: file.name ?? null, figma_version: file.version ?? null, preview_url: previewUrl, template, ticket_type_id: ticketTypeId, metadata: { lastModified: file.lastModified ?? null, frame: template.frame, elements: template.elements, qrPlaceholder: template.qrPlaceholder, qrMarker: template.qrMarker }, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const result = designId
      ? await supabase.from("event_designs").update(payload).eq("id", designId).eq("event_id", eventId).select("id").single()
      : await supabase.from("event_designs").insert(payload).select("id").single();
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
  const { error } = await supabase.from("event_designs").delete().eq("id", designId).eq("event_id", eventId);
  if (error) redirect(`/admin/events/${eventId}/design?error=figma_sync_failed`);
  revalidatePath(`/admin/events/${eventId}/design`);
}
