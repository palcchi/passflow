"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

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
  revalidatePath("/organizer/start");
  redirect("/organizer/start");
}
