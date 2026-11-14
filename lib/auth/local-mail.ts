import "server-only";

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Resend sends through HTTPS, so the EC2 host does not need outbound SMTP port 25. */
function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_VERIFY?.trim() || process.env.EMAIL_FROM?.trim() || "PassFlow Verification <verify@passflow.my.id>";
  if (!apiKey || !apiKey.startsWith("re_") || !from) {
    throw new Error("resend_not_configured");
  }
  return { apiKey, from };
}

/** Send transactional mail without logging recipients, content, or credentials. */
export async function sendLocalMail(message: MailMessage): Promise<void> {
  const config = getResendConfig();
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("resend_delivery_failed");
  }

  if (!response.ok) {
    // Do not log the provider response; it can include operational details.
    throw new Error(`resend_delivery_failed_${response.status}`);
  }
}

export function isLocalMailConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  return apiKey.startsWith("re_") && Boolean(process.env.EMAIL_FROM_VERIFY?.trim() || process.env.EMAIL_FROM?.trim() || "PassFlow Verification <verify@passflow.my.id>");
}
