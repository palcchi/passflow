"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth/session";

const messages: Record<string, string> = {
  record_in_use: "This record is used by stations, access rules, or historical logs. Disconnect unused references first, or deactivate the station/benefit to preserve its history.",
  record_not_found: "This record no longer exists. Refresh the page.",
  zone_required: "Choose a zone for this gate.",
  activity_required: "Choose an existing activity code.",
  benefit_required: "Choose an active benefit code.",
  invalid_zone: "This zone does not belong to this event.",
};
export async function manageEventResource(form: FormData): Promise<{ error?: string; success?: boolean }> {
  const eventId = String(form.get("eventId") ?? "");
  const id = String(form.get("id") ?? "");
  const kind = String(form.get("kind") ?? "");
  const operation = String(form.get("operation") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(eventId) || !uuid.test(id) || !["station", "zone", "activity", "benefit", "rule"].includes(kind) || !["update", "delete", "activate", "deactivate"].includes(operation)) return { error: "Invalid request." };
  if (operation === "delete" && form.get("confirmation") !== "yes") return { error: "Confirm deletion first." };
  const values = Object.fromEntries(["name", "description", "mode", "zone_id", "activity_code", "benefit_code"].map(key => [key, String(form.get(key) ?? "").trim().slice(0, key === "description" ? 500 : 100)]));
  if (operation === "update" && !values.name) return { error: "Enter a name." };
  const { supabase } = await requireOrganizer();
  const { error } = await supabase.rpc("manage_event_resource", { p_event_id: eventId, p_id: id, p_kind: kind, p_operation: operation, p_values: values });
  if (error) return { error: Object.entries(messages).find(([key]) => error.message.includes(key))?.[1] ?? "The change could not be saved. Check your access and try again." };
  revalidatePath(`/organizer/events/${eventId}`, "layout");
  return { success: true };
}
