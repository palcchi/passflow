"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { accountProfile, requireUser } from "@/lib/auth/session";
import { createServerAuthClient } from "@/lib/supabase/server";
import { updateLocalUserMetadata } from "@/lib/auth/local-user";
import { emailHtml, sendEmail } from "@/lib/email";
import { sendTicketQrWhatsApp, sendWhatsAppNotification } from "@/lib/whatsapp/zapo";
function resultReason(value: unknown) { const result = value as { reason?: unknown } | null; return result && typeof result === "object" && "reason" in result ? String(result.reason) : "unknown"; }
function rpcResult(value: unknown) { return value as { ok?: boolean; reason?: unknown } | null; }
export async function registerForEvent(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const ticket=String(formData.get("ticket_code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const phone = typeof context.user.user_metadata.phone === "string" ? context.user.user_metadata.phone : "";
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) redirect("/phone?next=" + encodeURIComponent(`/e/${slug}/claim`));
  // Attendee identity is the account profile; the name field only appears when the account has none yet.
  let name=accountProfile(context.user).fullName;
  if(!name){
    name=String(formData.get("name")??"").trim().replace(/\s+/g," ");
    if(name.length<2||name.length>100) redirect(`/e/${encodeURIComponent(slug)}/claim?error=invalid_name`);
    const profileSaved = process.env.PASSFLOW_LOCAL_AUTH === "true"
      ? await updateLocalUserMetadata(context.user.id, { full_name: name })
      : !(await createServerAuthClient()).auth.updateUser({ data: { full_name: name } }).then(({ error }) => !!error).then((failed) => !failed);
    if (!profileSaved) redirect(`/e/${encodeURIComponent(slug)}/claim?error=provider`);
  }
  const { data, error }=await context.supabase.rpc("register_for_event",{p_event_slug:slug,p_name:name,p_phone:phone||undefined,p_ticket_code:ticket||undefined});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  revalidatePath("/account");
  revalidatePath("/events");
  revalidatePath("/e/" + slug, "layout");

  // Deliver passes after a successful, approved registration. Provider failure
  // must not undo registration or prevent the attendee from opening their pass.
  try {
    const { data: eventRow } = await context.supabase
      .from("events").select("id,name,slug").eq("slug", slug).maybeSingle();
    const { data: attendee } = eventRow?.id
      ? await context.supabase.from("attendees")
          .select("id,name,email,phone,approval_status")
          .eq("event_id", eventRow.id).eq("user_id", context.user.id).maybeSingle()
      : { data: null };
    const pending = Boolean((rpcResult(data) as { pending?: boolean } | null)?.pending)
      || attendee?.approval_status === "pending";
    // Send event activity summaries to configured PassFlow administrators. Never
    // forward login OTPs, password-reset links, or other authentication secrets.
    if (eventRow && attendee) {
      const adminEmails = (process.env.PASSFLOW_ADMIN_EMAILS || "")
        .split(",").map((value) => value.trim()).filter(Boolean);
      const status = pending ? "Pending organizer approval" : "Registration confirmed";
      const adminHtml = emailHtml({
        kicker: "Registration activity",
        title: status + ": " + eventRow.name,
        body: "Attendee: " + (attendee.name || name) +
          ". Email: " + (attendee.email || context.user.email || "not provided") +
          ". WhatsApp: " + (attendee.phone || phone || "not provided") + ".",
        action: "Open event",
        href: "/e/" + encodeURIComponent(slug),
      });
      await Promise.all(adminEmails.map(async (address) => {
        const result = await sendEmail(address, status + " — " + eventRow.name, adminHtml, "alerts");
        if (!result.sent) console.warn("admin_registration_email_failed", result.reason);
      }));
      const adminPhone = process.env.PASSFLOW_ADMIN_WHATSAPP || "";
      if (adminPhone) {
        const result = await sendWhatsAppNotification(
          adminPhone,
          "Registration update — " + status + ". Event: " + eventRow.name +
            ". Attendee: " + (attendee.name || name) +
            ". Email: " + (attendee.email || context.user.email || "not provided") +
            ". WhatsApp: " + (attendee.phone || phone || "not provided") + ".",
        );
        if (!result.ok) console.warn("admin_registration_whatsapp_failed", result.reason || "unknown");
      }
    }
    if (eventRow && attendee && !pending && attendee.approval_status !== "rejected") {
      const { data: credential } = await context.supabase.from("qr_credentials")
        .select("code,status").eq("event_id", eventRow.id)
        .eq("attendee_id", attendee.id).eq("status", "active").maybeSingle();
      // Keep delivery links on the confirmed working route until the public
      // event-subdomain aliases have been verified end-to-end.
      const site = (process.env.NEXT_PUBLIC_APP_URL || "https://passflow.my.id").replace(/\/$/, "");
      const passUrl = site + "/e/" + encodeURIComponent(slug) + "/claim";
      const recipientEmail = attendee.email || context.user.email || "";
      if (recipientEmail) {
        const result = await sendEmail(
          recipientEmail,
          "Your pass for " + eventRow.name + " is ready",
          emailHtml({
            kicker: "Registration confirmed",
            title: "You're registered for " + eventRow.name + ".",
            body: "Hi " + (attendee.name || "there") + ", your registration is confirmed. Open your pass to view your check-in QR code.",
            action: "Open my ticket",
            href: passUrl,
          }),
          "tickets",
        );
        if (!result.sent) console.warn("registration_ticket_email_failed", result.reason);
      }
      if (attendee.phone && credential?.code && process.env.WHATSAPP_TICKET_DELIVERY_ENABLED === "true") {
        const result = await sendTicketQrWhatsApp({
          phone: attendee.phone,
          eventName: eventRow.name,
          eventSlug: slug,
          credentialCode: credential.code,
          passUrl,
        });
        if (!result.ok) console.warn("registration_ticket_whatsapp_failed", result.reason || "unknown");
      }
    }
  } catch {
    console.warn("registration_ticket_delivery_failed", "post_registration_delivery_error");
  }
  redirect("/e/" + encodeURIComponent(slug) + "/claim?" +
    ((rpcResult(data) as { pending?: boolean } | null)?.pending ? "requested" : "registered") + "=1");
}
export async function claimQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("claim_qr",{p_event_slug:slug,p_code:code});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?claimed=1`);
}
export async function replaceQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("replace_qr",{p_event_slug:slug,p_code:code});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?replaced=1`);
}


export async function markNotificationsRead() {
  const { supabase, user } = await requireUser("/notifications");
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    const { postgresQuery } = await import("@/lib/db/postgres");
    await postgresQuery("UPDATE public.notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [user.id]);
  } else {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  }
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
