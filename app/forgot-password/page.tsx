import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
export const metadata = { title: "Forgot password" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = { email: "Enter a valid email address.", unavailable: "Password recovery is temporarily unavailable. Please try again later." };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  return <AuthShell title="Forgot your password?" description="Enter your account email and we will send you a secure password reset link." backHref="/login" backLabel="Back to sign in" kicker="LET’S GET YOU BACK IN">
    {params.notice === "sent" ? <p role="status" className="auth-notice">If the email is registered, a reset link has been sent. Check your inbox and spam folder.</p> : <>
      {message && <p role="alert" className="auth-notice">{message}</p>}
      <form action={requestPasswordReset} className="auth-form"><label className="auth-field">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="name@company.com"/></div></label><AuthSubmit disabled={!ready}>Send reset link ↗</AuthSubmit></form>
    </>}
  </AuthShell>;
}
