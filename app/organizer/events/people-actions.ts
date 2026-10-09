"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth/session";
import { registrationDecisionEmail, sendEmail } from "@/lib/email";

export async function managePersonRecord(form: FormData): Promise<{ error?: string; success?: boolean }> {
  const eventId = String(form.get("eventId") ?? "");
  const id = String(form.get("id") ?? "");
  const kind = String(form.get("kind") ?? "");
  const operation = String(form.get("operation") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(id) ||
      !["attendee", "ticket"].includes(kind) || !["update", "delete"].includes(operation)) return { error: "Invalid request." };
  const { supabase } = await requireOrganizer();
  const { data: allowed } = await supabase.rpc("is_event_manager", { p_event_id: eventId });
  if (!allowed) return { error: "You do not have permission to manage this event." };

  if (operation === "delete") {
    if (form.get("confirmation") !== "yes") return { error: "Confirm deletion before continuing." };
    const { error } = await supabase.rpc("delete_event_person_record", { p_event_id: eventId, p_id: id, p_kind: kind });
    if (error) return { error: error.message.includes("record_in_use") ? "This record has attendees, access rules, designs, or scan history. Preserve the record and revoke its credential or remove unused references first." : "The record could not be deleted. Refresh the page and try again." };
  } else {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100) return { error: "Name is required and must be 100 characters or fewer." };
    if (kind === "attendee") {
      const email = String(form.get("email") ?? "").trim();
      const phone = String(form.get("phone") ?? "").trim();
      const ticket = String(form.get("ticketTypeId") ?? "");
      if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return { error: "Enter a valid email address." };
      if (phone.length > 40) return { error: "Phone number is too long." };
      if (ticket) {
        const { data } = await supabase.from("ticket_types").select("id").eq("event_id", eventId).eq("id", ticket).maybeSingle();
        if (!data) return { error: "This pass category is not available for the event." };
      }
      const { data, error } = await supabase.from("attendees").update({ name, email: email || null, phone: phone || null, ticket_type_id: ticket || null }).eq("event_id", eventId).eq("id", id).select("id").maybeSingle();
      if (error || !data) return { error: "The attendee could not be saved. Review the information and try again." };
    } else {
      const capacityRaw = String(form.get("capacity") ?? "").trim();
      const capacity = capacityRaw ? Number(capacityRaw.replace(/,/g, "")) : null;
      const priceRaw = String(form.get("price") ?? "").trim();
      if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(priceRaw)) return { error: "Use a valid price format, for example 150,000 or 12.50." };
      const price = Number(priceRaw.replace(/,/g, ""));
      if ((capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 0)) || !Number.isFinite(price) || price < 0) return { error: "Capacity and price must be zero or positive numbers." };
      const { count, error: countError } = await supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("ticket_type_id", id);
      if (countError) return { error: "The attendee count could not be verified." };
      if (capacity !== null && capacity < (count ?? 0)) return { error: "Capacity cannot be lower than the number of registered attendees." };
      const { data, error } = await supabase.from("ticket_types").update({ name, description: String(form.get("description") ?? "").trim().slice(0, 500) || null, capacity, price }).eq("event_id", eventId).eq("id", id).select("id").maybeSingle();
      if (error || !data) return { error: "The category could not be saved. Review the information and try again." };
    }
  }
  revalidatePath("/organizer/events");
  revalidatePath("/account");
  revalidatePath(`/organizer/events/${eventId}`, "layout");
  const { data: event } = await supabase.from("events").select("slug").eq("id", eventId).maybeSingle();
  if (event) revalidatePath(`/e/${event.slug}`, "layout");
  return { success: true };
}

// Approve or decline a pending registration; the attendee gets a notification (in the RPC) and an email.
export async function reviewRegistration(form: FormData) {
  const eventId = String(form.get("eventId") ?? "");
  const attendeeId = String(form.get("attendeeId") ?? "");
  const approve = form.get("decision") === "approve";
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(attendeeId)) return;
  const { supabase } = await requireOrganizer();
  const { data, error } = await supabase.rpc("review_attendee", { p_attendee_id: attendeeId, p_approve: approve });
  if (!error && data && typeof data === "object" && !Array.isArray(data)) {
    const result = data as { email?: string | null; name?: string; event_name?: string; event_slug?: string };
    if (result.email && result.event_slug) {
      const mail = registrationDecisionEmail({ approved: approve, name: result.name ?? "there", eventName: result.event_name ?? "the event", eventSlug: result.event_slug });
      await sendEmail(result.email, mail.subject, mail.html);
    }
  }
  revalidatePath(`/organizer/events/${eventId}/people`);
  revalidatePath(`/organizer/events/${eventId}`);
}

export async function saveEventAccess(form: FormData) {
  const eventId = String(form.get("eventId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return;
  const visibility = form.get("visibility") === "private" ? "private" : "public";
  const { supabase } = await requireOrganizer();
  await supabase.rpc("set_event_access", {
    p_event_id: eventId,
    p_visibility: visibility,
    p_registration_open: form.get("registration") !== "soon",
    p_requires_approval: form.get("approval") === "on",
  });
  revalidatePath(`/organizer/events/${eventId}`, "layout");
  revalidatePath("/events");
  revalidatePath("/");
}
