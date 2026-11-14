import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { resendPendingSignupPhoneOtp, signInWithGoogle, signUpWithEmail, verifyPendingSignupPhone } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { InternationalPhoneField } from "@/components/international-phone-field";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAuthContext()) redirect(next);
  const ready = !!getAppOrigin() && (process.env.PASSFLOW_LOCAL_AUTH === "true" || !!getSupabaseConfig());
  const verifyingPhone = params.step === "verify-phone";
  const challenge = typeof params.challenge === "string" && /^[0-9a-f-]{36}$/i.test(params.challenge) ? params.challenge : "";
  const error = typeof params.error === "string" ? params.error : "";
  const errorMessages: Record<string, string> = { invalid: "Review your username, email, phone number, and password, then try again.", provider: "We could not process the request. Please try again.", rate: "Too many signup codes were requested. Wait a minute or try again later.", delivery: "We could not send the WhatsApp code. Please try again later.", expired: "That signup code expired or is no longer active. Start registration again.", code: "Enter the 6-digit code sent to your WhatsApp.", wrong: "That code is incorrect. Check your WhatsApp message and try again." };
  return <AuthShell title="Let’s make it happen." description="Create your account to discover events and keep every pass in one place." kicker="A FRESH START">
    {error && errorMessages[error] && <p role="alert" className="auth-notice">{errorMessages[error]}</p>}
    {params.notice === "check-email" && <p role="status" className="auth-notice">Check your email to complete account verification.</p>}
    {params.notice === "mail-pending" && <p role="status" className="auth-notice">Your account was created locally, but email delivery is not configured yet. Check your Resend configuration, then request a new verification link from sign-in.</p>}
    {verifyingPhone && params.sent === "1" && <p role="status" className="auth-notice">A new WhatsApp verification code has been sent. It expires in 10 minutes.</p>}
    {verifyingPhone ? <>
      <p role="status" className="auth-notice">Enter the 6-digit code sent to your WhatsApp. Your account will be created after phone verification, then we’ll email you a link to verify your email address.</p>
      {challenge ? <form action={verifyPendingSignupPhone} className="auth-form">
        <input type="hidden" name="next" value={next}/><input type="hidden" name="challenge" value={challenge}/>
        <label className="auth-field" htmlFor="signup-phone-otp">WhatsApp verification code<div className="auth-input"><ShieldCheck size={17} aria-hidden="true"/><input id="signup-phone-otp" required name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="123456"/></div></label>
        <AuthSubmit>Verify number and continue</AuthSubmit>
      </form> : <p className="auth-notice">The verification session is invalid. Please start registration again.</p>}
      {challenge && <form action={resendPendingSignupPhoneOtp} className="auth-form"><input type="hidden" name="next" value={next}/><input type="hidden" name="challenge" value={challenge}/><AuthSubmit variant="outline">Resend WhatsApp code</AuthSubmit></form>}
      <p className="auth-switch"><Link href={"/register?next=" + encodeURIComponent(next)}>Back to registration</Link></p>
    </> : <>
    <form action={signUpWithEmail} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="register-username">Username<div className="auth-input"><UserRound size={17} aria-hidden="true"/><input id="register-username" required name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" placeholder="your_username" aria-describedby="username-help"/></div><small id="username-help">Use 3 to 24 letters, numbers, or underscores.</small></label>
      <label className="auth-field" htmlFor="register-email">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input id="register-email" required name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com"/></div></label>
      <label className="auth-field" htmlFor="register-phone">Phone / WhatsApp <small>Required for account contact and ticket delivery. Select a country code and enter a number that can receive WhatsApp messages.</small>
        <InternationalPhoneField id="register-phone" placeholder="812 3456 7890" />
      </label>
      <div className="auth-field"><span aria-hidden="true">Password</span><PasswordField autoComplete="new-password" placeholder="8+ characters, Aa and 1" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Use at least 8 characters with uppercase, lowercase, and a number."/><small>At least 8 characters, with an uppercase letter, a lowercase letter, and a number.</small></div>
      <p className="auth-consent">By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      <AuthSubmit disabled={!ready}>Create account</AuthSubmit>
    </form>
    <div className="auth-divider">or</div>
    <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4"/>Continue with Google</AuthSubmit></form>
    <p className="auth-switch">Already have an account? <Link href={"/login?next=" + encodeURIComponent(next)}>Sign in</Link></p>
    </>}
  </AuthShell>;
}
