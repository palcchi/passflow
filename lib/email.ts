const SITE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://passflow.my.id";
const FROM = process.env.EMAIL_FROM || "PassFlow <noreply@passflow.my.id>";

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Same layout as the Supabase auth templates in supabase/email-templates.
export function emailHtml({ kicker, title, body, action, href }: { kicker: string; title: string; body: string; action?: string; href?: string }) {
  const url = href ? `${SITE}${href}` : SITE;
  const button = action ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;"><tr><td style="border-radius:999px;background:#1d1d1f;"><a href="${url}" style="display:inline-block;padding:14px 26px;border-radius:999px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${escape(action)}</a></td></tr></table>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;color:#1d1d1f;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
<tr><td style="padding:0 4px 18px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="width:30px;height:30px;border-radius:9px;background:#1d1d1f;color:#ffffff;font-size:15px;font-weight:800;text-align:center;line-height:30px;">P</td><td style="padding-left:10px;font-size:17px;font-weight:700;letter-spacing:-.02em;">PassFlow</td></tr></table></td></tr>
<tr><td style="background:#ffffff;border-radius:24px;padding:36px 32px;border:1px solid #e8e8ed;">
<p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#86868b;">${escape(kicker)}</p>
<h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-.035em;">${escape(title)}</h1>
<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#515154;">${escape(body)}</p>${button}
</td></tr>
<tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:#86868b;">You received this because of your registration on PassFlow. <a href="${SITE}/privacy" style="color:#86868b;">Privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}

// ponytail: plain fetch to the Resend API, no SDK; failures are logged and never block the action.
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not_configured" as const };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!response.ok) {
      console.error("resend_failed", response.status, await response.text().catch(() => ""));
      return { sent: false, reason: "provider" as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("resend_failed", error);
    return { sent: false, reason: "provider" as const };
  }
}

export function registrationDecisionEmail({ approved, name, eventName, eventSlug }: { approved: boolean; name: string; eventName: string; eventSlug: string }) {
  return approved
    ? {
        subject: `You're in: ${eventName}`,
        html: emailHtml({ kicker: "Registration approved", title: `See you at ${eventName}.`, body: `Hi ${name}, the organizer approved your registration. Your QR pass is ready in PassFlow.`, action: "Open my pass", href: `/e/${eventSlug}/claim` }),
      }
    : {
        subject: `Update on your registration for ${eventName}`,
        html: emailHtml({ kicker: "Registration update", title: "Your registration was not approved.", body: `Hi ${name}, the organizer of ${eventName} could not approve your registration this time.`, action: "View event", href: `/e/${eventSlug}` }),
      };
}
