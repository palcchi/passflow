import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { requireUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { isValidE164Phone } from "@/lib/auth/phone";
import { InternationalPhoneField } from "@/components/international-phone-field";
import { sendRequiredPhoneOtp, resendRequiredPhoneOtp, verifyRequiredPhoneOtp } from "./actions";

export const metadata = { title: "Verify phone number", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RequiredPhonePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const { user } = await requireUser("/phone?next=" + encodeURIComponent(next));
  const existing = typeof user.user_metadata.phone === "string" ? user.user_metadata.phone : "";
  const verified = user.user_metadata.phone_verified === true;
  if (isValidE164Phone(existing) && verified) redirect(next);
  const step = params.step === "verify" ? "verify" : "phone";
  const error = typeof params.error === "string" ? params.error : "";
  const messages: Record<string, string> = {
    invalid: "That phone number is invalid. Check the country calling code and number.",
    disabled: "WhatsApp verification has not been enabled by the administrator.",
    rate: "You have reached the code sending limit. Try again in one hour.",
    wait: "Wait 60 seconds before requesting another code.",
    delivery: "We could not send the code. Check PassFlow WhatsApp connectivity and try again.",
    setup: "The verification service is not ready. Please try again later.",
    missing: "No active code was found. Request a new code.",
    attempts: "You have reached the attempt limit. Request a new code.",
    expired: "This code has expired. Request a new code.",
    code: "Enter the 6-digit verification code.",
    wrong: "That code is incorrect. Check your WhatsApp message and try again.",
  };
  return <AuthShell title={step === "verify" ? "Verify your WhatsApp." : "Add your phone number."} description={step === "verify" ? "Enter the 6-digit code sent to your WhatsApp." : "PassFlow will send a one-time code to confirm that you own this WhatsApp number."} kicker="PHONE VERIFICATION" backHref="/account" backLabel="Back to account">
    {params.sent === "1" && <p role="status" className="auth-notice">Your WhatsApp code has been sent. It expires in 10 minutes.</p>}
    {error && messages[error] && <p role="alert" className="auth-notice">{messages[error]}</p>}
    {step === "verify" ? <>
      <form action={verifyRequiredPhoneOtp} className="auth-form">
        <input type="hidden" name="next" value={next}/>
        <label className="auth-field" htmlFor="phone-otp">Verification code<div className="auth-input"><ShieldCheck size={17} aria-hidden="true"/><input id="phone-otp" required name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="123456"/></div></label>
        <AuthSubmit>Verify phone number</AuthSubmit>
      </form>
      <form action={resendRequiredPhoneOtp} className="auth-form"><input type="hidden" name="next" value={next}/><AuthSubmit>Resend code</AuthSubmit></form>
    </> : <form action={sendRequiredPhoneOtp} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="required-phone">Phone / WhatsApp number<div><InternationalPhoneField id="required-phone" placeholder="812 3456 7890" /></div><small>Select the country calling code, then enter your number. PassFlow will format it internationally.</small></label>
      <AuthSubmit>Send WhatsApp code</AuthSubmit>
    </form>}
  </AuthShell>;
}
