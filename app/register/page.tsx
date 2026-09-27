import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { signInWithGoogle, signUpWithEmail } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAuthContext()) redirect(next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  return <AuthShell title="Let’s make it happen." description="Create your account to discover events and keep every pass in one place." kicker="A FRESH START">
    {params.error && <p role="alert" className="auth-notice">Review your username, email, and password, then try again.</p>}
    {params.notice === "check-email" && <p role="status" className="auth-notice">Check your email to complete account verification.</p>}
    <form action={signUpWithEmail} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="register-username">Username<div className="auth-input"><UserRound size={17} aria-hidden="true"/><input id="register-username" required name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" placeholder="e.g. vallian" aria-describedby="username-help"/></div><small id="username-help">Use 3–24 letters, numbers, or underscores.</small></label>
      <label className="auth-field" htmlFor="register-email">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input id="register-email" required name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.com"/></div></label>
      <div className="auth-field"><span aria-hidden="true">Password</span><PasswordField autoComplete="new-password" placeholder="At least 8 characters"/></div>
      <AuthSubmit disabled={!ready}>Create account ↗</AuthSubmit>
    </form>
    <div className="auth-divider">atau</div>
    <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4"/>Continue with Google</AuthSubmit></form>
    <p className="auth-switch">Already have an account? <Link href={"/login?next=" + encodeURIComponent(next)}>Sign in</Link></p>
  </AuthShell>;
}
