import "server-only";
import { emailHtml, sendEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp/zapo";

type AdminNotice = {
  type: string;
  subject: string;
  title: string;
  body: string;
  href?: string;
  whatsappText?: string;
};

/** Best-effort external admin alerts. Notification failures never roll back a successful user action. */
export async function notifyPassflowAdmins(notice: AdminNotice): Promise<void> {
  const emails = (process.env.PASSFLOW_ADMIN_EMAILS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const phone = process.env.PASSFLOW_ADMIN_WHATSAPP || "";
  const jobs: Promise<void>[] = [];
  for (const email of emails) {
    jobs.push((async () => {
      try {
        const result = await sendEmail(email, notice.subject, emailHtml({
          kicker: "Account activity",
          title: notice.title,
          body: notice.body,
          action: notice.href ? "Open PassFlow" : undefined,
          href: notice.href,
        }), "alerts");
        if (!result.sent) console.warn("admin_notification_email_failed", notice.type, result.reason || "unknown");
      } catch {
        console.warn("admin_notification_email_failed", notice.type);
      }
    })());
  }
  if (phone && notice.whatsappText) {
    jobs.push((async () => {
      try {
        const detail = notice.whatsappText!.replace(/^PassFlow admin alert:\s*/i, "");
        const message = "*" + notice.title + "*\n\n" + detail;
        const result = await sendWhatsAppNotification(phone, message);
        if (!result.ok) console.warn("admin_notification_whatsapp_failed", notice.type, result.reason || "unknown");
      } catch {
        console.warn("admin_notification_whatsapp_failed", notice.type);
      }
    })());
  }
  await Promise.all(jobs);
}
