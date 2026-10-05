import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { resendSignupConfirmation, signInWithEmail, signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  unavailable: "Sign-in is temporarily unavailable. Please try again later.",
  provider: "We could not process the request. Please try again.",
  invalid: "The email or password is incorrect.",
  unverified: "Your email has not been verified. Request a new verification email below.",
  expired: "Your session has expired. Please sign in again.",
  callback: "The confirmation link is invalid or has expired.",
  signout: "We could not sign you out. Please try again.",
  reset: "Your new password has been saved.",
};
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAuthContext()) redirect(next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  return <AuthShell title="Welcome back." description="Sign in to manage your events, passes, and account." kicker="SIGN IN">
    {message && <p role={params.error === "reset" ? "status" : "alert"} className="auth-notice">{message}</p>}
    {params.notice === "signed-out" && <p role="status" className="auth-notice">You have been signed out.</p>}
    {params.notice === "verification-sent" && <p role="status" className="auth-notice">A new verification link has been sent.</p>}
    {params.notice === "reset-sent" && <p role="status" className="auth-notice">If the email is registered, a reset link has been sent.</p>}
    <form action={signInWithEmail} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="login-email">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input id="login-email" required name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com"/></div></label>
      <div className="auth-field"><span aria-hidden="true">Password</span><PasswordField autoComplete="current-password"/></div>
      <AuthSubmit disabled={!ready}>Sign in</AuthSubmit>
    </form>
    <div className="auth-divider">or</div>
    <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4"/>Continue with Google</AuthSubmit></form>
    <div className="auth-form-links"><Link href={"/register?next=" + encodeURIComponent(next)}>Create an account</Link><Link href="/reset-password">Forgot password?</Link></div>
    {params.error === "unverified" && <form action={resendSignupConfirmation} className="auth-form auth-resend"><input type="hidden" name="next" value={next}/><label className="auth-field">Verification email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input required name="email" type="email" autoComplete="email" placeholder="you@company.com"/></div></label><AuthSubmit disabled={!ready} variant="outline">Resend verification email</AuthSubmit></form>}
  </AuthShell>;
}
