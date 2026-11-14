"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { serviceClient } from "@/lib/supabase/service";
import { postgresQuery } from "@/lib/db/postgres";
import { emailHtml, sendEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp/zapo";
import { notifyPassflowAdmins } from "@/lib/notifications";

async function notifyOrganizerTarget(userId: string, approved: boolean) {
  let email = "";
  let phone = "";
  try {
    if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
      const result = await postgresQuery<{ email: string | null; raw_user_meta_data: Record<string, unknown> | null }>(
        "SELECT email, raw_user_meta_data FROM auth.users WHERE id = $1 LIMIT 1", [userId],
      );
      email = result.rows[0]?.email || "";
      const rawPhone = result.rows[0]?.raw_user_meta_data?.phone;
      phone = typeof rawPhone === "string" ? rawPhone : "";
    } else {
      const { data } = await serviceClient().auth.admin.getUserById(userId);
      email = data.user?.email || "";
      const rawPhone = data.user?.user_metadata?.phone;
      phone = typeof rawPhone === "string" ? rawPhone : "";
    }
  } catch {
    console.warn("organizer_status_recipient_lookup_failed");
  }
  const subject = approved ? "Your organizer access is approved" : "Your organizer access has been revoked";
  const title = approved ? "Organizer access approved." : "Organizer access revoked.";
  const body = approved
    ? "Your organizer access is active. You can create and manage events in PassFlow."
    : "Your organizer access is no longer active. If you believe this is a mistake, contact PassFlow support.";
  if (email) {
    const result = await sendEmail(email, subject, emailHtml({ kicker: "Organizer account update", title, body, action: approved ? "Open organizer workspace" : undefined, href: "/organizer/events" }), "organizers");
    if (!result.sent) console.warn("organizer_status_email_failed", approved ? "approved" : "revoked", result.reason || "unknown");
  }
  if (phone) {
    const result = await sendWhatsAppNotification(phone, `*${title}*\n\n${body}`);
    if (!result.ok) console.warn("organizer_status_whatsapp_failed", approved ? "approved" : "revoked", result.reason || "unknown");
  }
  await notifyPassflowAdmins({
    type: approved ? "organizer_approved" : "organizer_revoked",
    subject: `Organizer access ${approved ? "approved" : "revoked"}`,
    title: approved ? "Organizer access approved" : "Organizer access revoked",
    body: approved ? "Organizer access was activated by a platform administrator." : "Organizer access was revoked by a platform administrator.",
    href: "/platform/organizers",
    whatsappText: `Organizer access was ${approved ? "approved" : "revoked"} by a platform administrator.`,
  });
}

async function adminTarget(formData: FormData) {
  const { user } = await requireUser("/platform/organizers");
  if (!isPlatformAdmin(user)) redirect("/unauthorized");
  const userId = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) redirect("/platform/organizers?status=error");
  return userId;
}

export async function approveOrganizer(formData: FormData) {
  const userId = await adminTarget(formData);
  try {
    if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
      await postgresQuery("SELECT public.review_organizer_application($1::uuid, true)", [userId]);
    } else {
      const { error } = await serviceClient().rpc("review_organizer_application", { p_user_id: userId, p_approve: true });
      if (error) throw error;
    }
  } catch {
    revalidatePath("/platform/organizers");
    redirect("/platform/organizers?status=error");
  }
  await notifyOrganizerTarget(userId, true);
  revalidatePath("/platform/organizers");
  redirect("/platform/organizers?status=approved");
}

export async function revokeOrganizer(formData: FormData) {
  const userId = await adminTarget(formData);
  try {
    if (process.env.PASSFLOW_LOCAL_DATABASE === "true") {
      await postgresQuery("BEGIN");
      try {
        const app = await postgresQuery<{ organization_id: string | null }>("SELECT organization_id FROM public.organizer_applications WHERE user_id = $1 FOR UPDATE", [userId]);
        if (app.rows[0]?.organization_id) {
          await postgresQuery("DELETE FROM public.organization_members WHERE user_id = $1 AND organization_id = $2", [userId, app.rows[0].organization_id]);
        }
        await postgresQuery("UPDATE public.organizer_applications SET status = 'rejected', reviewed_at = now() WHERE user_id = $1", [userId]);
        await postgresQuery("COMMIT");
      } catch (error) {
        await postgresQuery("ROLLBACK");
        throw error;
      }
    } else {
      const admin = serviceClient();
      const { data: app } = await admin.from("organizer_applications").select("organization_id").eq("user_id", userId).maybeSingle();
      if (app?.organization_id) {
        const { error } = await admin.from("organization_members").delete().eq("user_id", userId).eq("organization_id", app.organization_id);
        if (error) throw error;
      }
      const { error } = await admin.from("organizer_applications").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) throw error;
    }
  } catch {
    revalidatePath("/platform/organizers");
    redirect("/platform/organizers?status=error");
  }
  await notifyOrganizerTarget(userId, false);
  revalidatePath("/platform/organizers");
  redirect("/platform/organizers?status=revoked");
}
