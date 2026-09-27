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

export const metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  unavailable: "Login belum tersedia. Silakan coba lagi nanti.",
  provider: "Permintaan belum bisa diproses. Silakan coba lagi.",
  invalid: "Email atau password tidak cocok.",
  unverified: "Email belum diverifikasi. Kirim ulang tautan verifikasi di bawah.",
  expired: "Sesi sudah berakhir. Silakan masuk lagi.",
  "figma-session": "Sesi PassFlow tidak terbaca setelah kembali dari Figma. Masuk di browser yang sama, lalu ulangi koneksi dari Profil.",
  callback: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa.",
  signout: "Belum berhasil keluar. Silakan coba lagi.",
  reset: "Password baru sudah disimpan.",
};
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAuthContext()) redirect(next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  return <AuthShell title="Welcome back." description="Masuk untuk melanjutkan cerita, event, dan pass kamu." kicker="MAKE YOURSELF AT HOME">
    {message && <p role={params.error === "reset" ? "status" : "alert"} className="auth-notice">{message}</p>}
    {params.notice === "signed-out" && <p role="status" className="auth-notice">Kamu sudah keluar.</p>}
    {params.notice === "verification-sent" && <p role="status" className="auth-notice">Tautan verifikasi baru sudah dikirim.</p>}
    {params.notice === "reset-sent" && <p role="status" className="auth-notice">Jika email terdaftar, tautan reset sudah dikirim.</p>}
    <form action={signInWithEmail} className="auth-form">
      <input type="hidden" name="next" value={next}/>
      <label className="auth-field" htmlFor="login-email">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input id="login-email" required name="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@email.com"/></div></label>
      <div className="auth-field"><span aria-hidden="true">Password</span><PasswordField autoComplete="current-password"/></div>
      <AuthSubmit disabled={!ready}>Masuk ke PassFlow ↗</AuthSubmit>
    </form>
    <div className="auth-divider">atau</div>
    <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4"/>Lanjut dengan Google</AuthSubmit></form>
    <div className="auth-form-links"><Link href={"/register?next=" + encodeURIComponent(next)}>Buat akun baru</Link><Link href="/reset-password">Lupa password?</Link></div>
    {params.error === "unverified" && <form action={resendSignupConfirmation} className="auth-form auth-resend"><input type="hidden" name="next" value={next}/><label className="auth-field">Email untuk verifikasi<div className="auth-input"><Mail size={17} aria-hidden="true"/><input required name="email" type="email" autoComplete="email" placeholder="nama@email.com"/></div></label><AuthSubmit disabled={!ready} variant="outline">Kirim ulang verifikasi</AuthSubmit></form>}
  </AuthShell>;
}
