"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import {
  fetchFigmaDesignSnapshot,
  getFigmaAccessToken,
  parseFigmaUrl,
} from "@/lib/figma";

const designKinds = new Set([
  "id_card",
  "lanyard",
  "wristband",
  "ticket",
  "event_cover",
  "event_page",
]);

async function requireDesignManager(eventId: string) {
  const context = await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const { data: allowed } = await context.supabase.rpc("is_event_manager", {
    p_event_id: eventId,
  });
  if (!allowed) redirect("/unauthorized");
  return context;
}

function designPath(eventId: string, state?: string) {
  return `/admin/events/${eventId}/design${state ? `?design=${state}` : ""}`;
}

export async function attachFigmaDesign(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const figmaUrl = String(formData.get("figmaUrl") ?? "").trim();

  if (!eventId || !designKinds.has(kind) || !figmaUrl) {
    redirect(designPath(eventId || "unknown", "invalid"));
  }

  const { supabase, user } = await requireDesignManager(eventId);

  try {
    const parsed = parseFigmaUrl(figmaUrl);
    const accessToken = await getFigmaAccessToken(supabase, user.id);
    const snapshot = await fetchFigmaDesignSnapshot(accessToken, parsed);

    const { error } = await supabase.from("event_designs").upsert(
      {
        event_id: eventId,
        kind,
        name: name || snapshot.fileName,
        figma_file_key: parsed.fileKey,
        figma_node_id: parsed.nodeId,
        figma_file_url: figmaUrl,
        figma_file_name: snapshot.fileName,
        figma_version: snapshot.version,
        preview_url: snapshot.previewUrl,
        created_by: user.id,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,kind" },
    );

    if (error) throw error;
  } catch {
    redirect(designPath(eventId, "figma_error"));
  }

  revalidatePath(designPath(eventId));
  redirect(designPath(eventId, "linked"));
}

export async function syncFigmaDesign(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const designId = String(formData.get("designId") ?? "");
  const { supabase, user } = await requireDesignManager(eventId);

  const { data: design } = await supabase
    .from("event_designs")
    .select("id, figma_file_url")
    .eq("id", designId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!design) redirect(designPath(eventId, "missing"));

  try {
    const parsed = parseFigmaUrl(design.figma_file_url);
    const accessToken = await getFigmaAccessToken(supabase, user.id);
    const snapshot = await fetchFigmaDesignSnapshot(accessToken, parsed);
    const { error } = await supabase
      .from("event_designs")
      .update({
        figma_file_name: snapshot.fileName,
        figma_version: snapshot.version,
        preview_url: snapshot.previewUrl,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", designId)
      .eq("event_id", eventId);

    if (error) throw error;
  } catch {
    redirect(designPath(eventId, "figma_error"));
  }

  revalidatePath(designPath(eventId));
  redirect(designPath(eventId, "synced"));
}

export async function removeFigmaDesign(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const designId = String(formData.get("designId") ?? "");
  const { supabase } = await requireDesignManager(eventId);

  await supabase
    .from("event_designs")
    .delete()
    .eq("id", designId)
    .eq("event_id", eventId);

  revalidatePath(designPath(eventId));
  redirect(designPath(eventId, "removed"));
}

export async function disconnectFigma(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireDesignManager(eventId);

  await supabase.from("figma_connections").delete().eq("user_id", user.id);

  revalidatePath(designPath(eventId));
  redirect(designPath(eventId, "disconnected"));
}
