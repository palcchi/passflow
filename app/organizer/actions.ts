"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

export async function submitOrganizerApplication(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim().replace(/\s+/g, " ");
  const organizationName = field("organizationName");
  const phone = field("phone") || null;
  const city = field("city") || null;
  const eventScale = field("eventScale") || null;

  if (organizationName.length < 2 || organizationName.length > 80) redirect("/organizer/start?status=invalid-name");
  if (phone && !/^\+?[0-9 ()-]{6,24}$/.test(phone)) redirect("/organizer/start?status=invalid-phone");
  if (city && city.length > 60) redirect("/organizer/start?status=invalid-city");
  if (eventScale && !["small", "medium", "large"].includes(eventScale)) redirect("/organizer/start?status=invalid-scale");

  const { supabase, user } = await requireUser("/organizer/start");
  const { error } = await supabase.from("organizer_applications").insert({
    user_id: user.id,
    organization_name: organizationName,
    phone,
    city,
    event_scale: eventScale,
  });
  // 23505: an application already exists; the status page shows it.
  if (error && error.code !== "23505") redirect("/organizer/start?status=error");
  // Organizer access is self-serve: approve straight away. A revoked account stays rejected (review only accepts
  // pending applications), and if the server cannot approve, the application waits on the admin page.
  let approved = false;
  try { approved = !(await serviceClient().rpc("review_organizer_application", { p_user_id: user.id, p_approve: true })).error; } catch {}
  revalidatePath("/organizer/start");
  redirect(approved ? "/organizer/events" : "/organizer/start");
}
