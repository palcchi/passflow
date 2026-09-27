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

export const metadata = { title: "Buat akun" };
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAuthContext()) redirect(next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  return <AuthShell title="Let’s make it happen." description="Buat akun dan temukan momen yang terasa seperti kamu." kicker="A FRESH START">
    {params.error && <p role="alert" className="auth-notice">Periksa username, email, dan password lalu coba lagi.</p>}
    {params.notice === "check-email" && <p role="status" className="auth-notice">Cek email untuk menyelesaikan verifikasi akun.</p>}
    <form action={signUpWithEmail} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="register-username">Username<div className="auth-input"><UserRound size={17} aria-hidden="true"/><input id="register-username" required name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" placeholder="namakamu" aria-describedby="username-help"/></div><small id="username-help">3–24 huruf, angka, atau garis bawah. Tidak harus unik.</small></label>
      <label className="auth-field" htmlFor="register-email">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input id="register-email" required name="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@email.com"/></div></label>
      <div className="auth-field"><span aria-hidden="true">Password</span><PasswordField autoComplete="new-password" placeholder="Minimal 8 karakter"/></div>
      <AuthSubmit disabled={!ready}>Buat akun ↗</AuthSubmit>
    </form>
    <div className="auth-divider">atau</div>
    <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4"/>Daftar dengan Google</AuthSubmit></form>
    <p className="auth-switch">Sudah punya akun? <Link href={"/login?next=" + encodeURIComponent(next)}>Masuk di sini</Link></p>
  </AuthShell>;
}
