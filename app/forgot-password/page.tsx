import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
export const metadata = { title: "Lupa password" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = { email: "Masukkan alamat email yang valid.", unavailable: "Pemulihan password belum tersedia. Silakan coba lagi nanti." };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  return <AuthShell title="Lupa password?" description="Masukkan email akunmu. Kami akan mengirim tautan untuk membuat password baru." backHref="/login" backLabel="Kembali ke login" kicker="LET’S GET YOU BACK IN">
    {params.notice === "sent" ? <p role="status" className="auth-notice">Jika email tersebut terdaftar, tautan reset sudah dikirim. Cek inbox dan folder spam.</p> : <>
      {message && <p role="alert" className="auth-notice">{message}</p>}
      <form action={requestPasswordReset} className="auth-form"><label className="auth-field">Email<div className="auth-input"><Mail size={17} aria-hidden="true"/><input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="nama@email.com"/></div></label><AuthSubmit disabled={!ready}>Kirim tautan reset ↗</AuthSubmit></form>
    </>}
  </AuthShell>;
}
