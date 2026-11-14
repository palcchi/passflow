"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";
import { emailHtml, sendEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp/zapo";
import { notifyPassflowAdmins } from "@/lib/notifications";

export async function submitOrganizerApplication(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "").trim().replace(/\s+/g, " ");
  const organizationName = field("organizationName");
  const city = field("city") || null;
  const eventScale = field("eventScale") || null;

  if (organizationName.length < 2 || organizationName.length > 80) redirect("/organizer/start?status=invalid-name");
  if (city && city.length > 60) redirect("/organizer/start?status=invalid-city");
  if (eventScale && !["small", "medium", "large"].includes(eventScale)) redirect("/organizer/start?status=invalid-scale");

  const { supabase, user } = await requireUser("/organizer/start");
  const phone = typeof user.user_metadata.phone === "string" ? user.user_metadata.phone : "";
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) redirect("/phone?next=%2Forganizer%2Fstart");
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
  if (approved) {
    const accountEmail = user.email || "";
    if (accountEmail) {
      const mail = await sendEmail(accountEmail, "Your organizer access is ready", emailHtml({
        kicker: "Organizer access approved",
        title: "Your organizer workspace is ready.",
        body: `Your organizer access for ${organizationName} is active. You can now create and manage events in PassFlow.`,
        action: "Open organizer workspace",
        href: "/organizer/events",
      }), "organizers");
      if (!mail.sent) console.warn("organizer_approval_email_failed", mail.reason || "unknown");
    }
    if (phone) {
      const message = await sendWhatsAppNotification(phone, `*Organizer access approved* ✓\n\nYour access for *${organizationName}* is active. You can now create and manage events in your organizer workspace.`);
      if (!message.ok) console.warn("organizer_approval_whatsapp_failed", message.reason || "unknown");
    }
    await notifyPassflowAdmins({
      type: "organizer_approved",
      subject: `Organizer access approved — ${organizationName}`,
      title: "Organizer access approved",
      body: `Organizer access for “${organizationName}” was activated.`,
      href: "/organizer/events",
      whatsappText: `Organizer access for “${organizationName}” was activated.`,
    });
  }
  revalidatePath("/organizer/start");
  redirect(approved ? "/organizer/events" : "/organizer/start");
}
