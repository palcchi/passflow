const SITE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://passflow.my.id";

export type EmailPurpose = "general" | "verification" | "tickets" | "organizers" | "alerts" | "help";

const FROM_DEFAULTS: Record<EmailPurpose, string> = {
  general: "PassFlow <noreply@passflow.my.id>",
  verification: "PassFlow Verification <verify@passflow.my.id>",
  tickets: "PassFlow Tickets <tickets@passflow.my.id>",
  organizers: "PassFlow Organizers <organizers@passflow.my.id>",
  alerts: "PassFlow Alerts <alerts@passflow.my.id>",
  help: "PassFlow Help <help@passflow.my.id>",
};

const FROM_ENV: Record<EmailPurpose, string> = {
  general: "EMAIL_FROM_NOREPLY",
  verification: "EMAIL_FROM_VERIFY",
  tickets: "EMAIL_FROM_TICKETS",
  organizers: "EMAIL_FROM_ORGANIZERS",
  alerts: "EMAIL_FROM_ALERTS",
  help: "EMAIL_FROM_HELP",
};

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function senderFor(purpose: EmailPurpose) {
  const configured = process.env[FROM_ENV[purpose]]?.trim();
  if (configured) return configured;
  // Keep backward compatibility with EMAIL_FROM, but never reuse a verification-only sender for general mail.
  const legacy = process.env.EMAIL_FROM?.trim();
  if (purpose === "general" && legacy && !/verify@/i.test(legacy)) return legacy;
  return FROM_DEFAULTS[purpose];
}

// Shared transactional email template aligned with PassFlow's monochrome Figma identity.
export function emailHtml({ kicker, title, body, action, href }: { kicker: string; title: string; body: string; action?: string; href?: string }) {
  const url = href ? (/^https?:\/\//i.test(href) ? href : `${SITE}${href}`) : SITE;
  const button = action ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 0;"><tr><td align="center" style="border-radius:9px;background:#171717;"><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:9px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escape(action)} &nbsp; &#8599;</a></td></tr></table>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escape(title)} · PassFlow</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#171717;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f2;padding:34px 14px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
<tr><td style="padding:0 2px 22px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td valign="middle"><img src="${SITE}/passflow-logo.png" width="46" height="46" alt="PassFlow" style="display:block;width:46px;height:46px;border:0;border-radius:12px;"></td><td style="padding-left:12px;"><div style="font-size:21px;font-weight:800;letter-spacing:-.045em;color:#171717;">PassFlow</div><div style="font-size:11px;color:#686868;margin-top:3px;">Make every entry count.</div></td></tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e7e7e3;border-radius:18px;padding:32px 30px 30px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr><td style="width:24px;height:4px;background:#ff6257;border-radius:4px;"></td><td style="width:24px;height:4px;background:#ffbf35;border-radius:4px;"></td><td style="width:24px;height:4px;background:#28bd58;border-radius:4px;"></td></tr></table>
<p style="margin:0 0 12px;font-size:11px;line-height:1.5;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#66665f;">${escape(kicker)}</p>
<h1 style="margin:0;font-size:29px;line-height:1.16;font-weight:800;letter-spacing:-.045em;color:#171717;">${escape(title)}</h1>
<p style="margin:17px 0 0;font-size:15px;line-height:1.8;color:#55554f;">${escape(body)}</p>${button}
<div style="margin-top:30px;padding-top:18px;border-top:1px solid #eeeeea;font-size:12px;line-height:1.7;color:#777770;">Need help? Email <a href="mailto:help@passflow.my.id" style="color:#171717;text-decoration:underline;font-weight:700;">help@passflow.my.id</a> or visit <a href="${SITE}" style="color:#171717;text-decoration:underline;font-weight:700;">PassFlow</a>.</div>
</td></tr>
<tr><td style="padding:20px 8px 0;text-align:center;font-size:11px;line-height:1.7;color:#85857e;">You received this email because of activity on PassFlow.<br/><a href="${SITE}/privacy" style="color:#686861;text-decoration:underline;">Privacy</a> &nbsp;·&nbsp; <a href="${SITE}/terms" style="color:#686861;text-decoration:underline;">Terms</a> &nbsp;·&nbsp; <a href="${SITE}" style="color:#686861;text-decoration:underline;">passflow.my.id</a></td></tr>
</table></td></tr></table></body></html>`;
}

// Plain fetch to the Resend API; failures are logged without exposing recipient or message data.
export async function sendEmail(to: string, subject: string, html: string, purpose: EmailPurpose = "general") {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not_configured" as const };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: senderFor(purpose), to, subject, html }),
    });
    if (!response.ok) {
      console.warn("resend_failed", response.status);
      return { sent: false, reason: "provider" as const };
    }
    return { sent: true as const };
  } catch {
    console.warn("resend_failed", "network_error");
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
