import Link from "next/link";
import { ArrowLeft, KeyRound, Mail, ScanLine } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { resendSignupConfirmation, signInWithEmail, signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Masuk atau daftar" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  unavailable: "Login belum tersedia. Silakan coba lagi nanti.",
  provider: "Belum bisa memproses permintaan. Silakan coba lagi.",
  invalid: "Email atau password salah. Pastikan password minimal 8 karakter.",
  unverified: "Email akun ini belum diverifikasi. Masukkan email di bawah untuk meminta tautan baru.",
  expired: "Sesi sudah kedaluwarsa. Silakan masuk lagi.",
  callback: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Masuk lagi untuk meminta tautan verifikasi baru.",
  signout: "Belum berhasil keluar. Silakan kembali ke akun dan coba lagi.",
  reset: "Password baru sudah disimpan.",
};
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  return <main className="min-h-screen bg-background px-5 py-8 sm:py-14">
    <div className="mx-auto max-w-md">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> Kembali ke PassFlow</Link>
      <section className="mt-10 rounded-lg border border-border bg-card p-6 sm:p-9">
        <span className="brand-mark mb-8">P</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Satu akun. Semua momen.</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Selamat datang<br />di PassFlow.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Masuk dengan email yang sudah terdaftar. Google tersedia sebagai pilihan tambahan untuk akun yang terhubung.</p>
        {message && <p role="alert" className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{message}</p>}
        {params.notice === "signed-out" && <p role="status" className="mt-6 text-sm text-success">Kamu sudah keluar dari perangkat ini.</p>}
        {params.notice === "verification-sent" && <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm">Jika akun menunggu verifikasi, tautan baru sudah dikirim. Buka email terbaru dari PassFlow.</p>}
        {params.notice === "reset-sent" && <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm">Jika email terdaftar, tautan reset password sudah dikirim.</p>}
        {!ready && <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">Login sedang disiapkan. Halaman event tetap bisa kamu jelajahi.</p>}
        <form action={signInWithEmail} className="mt-7 space-y-3"><input type="hidden" name="next" value={next}/><label className="flex items-center gap-2 rounded-md border border-border px-3"><Mail size={16} className="text-muted-foreground"/><span className="sr-only">Email</span><input required name="email" type="email" autoComplete="email" placeholder="email@contoh.com" className="min-h-11 w-full bg-transparent text-sm outline-none"/></label><label className="flex items-center gap-2 rounded-md border border-border px-3"><KeyRound size={16} className="text-muted-foreground"/><span className="sr-only">Password</span><input required name="password" type="password" minLength={8} autoComplete="current-password" placeholder="Password minimal 8 karakter" className="min-h-11 w-full bg-transparent text-sm outline-none"/></label><AuthSubmit disabled={!ready}>Masuk dengan email</AuthSubmit></form>
        {params.error === "unverified" && <form action={resendSignupConfirmation} className="mt-3 space-y-3"><input type="hidden" name="next" value={next}/><label className="block text-xs font-medium text-muted-foreground">Email untuk kirim ulang tautan<input required name="email" type="email" autoComplete="email" placeholder="email@contoh.com" className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"/></label><AuthSubmit disabled={!ready} variant="outline">Kirim ulang verifikasi</AuthSubmit></form>}
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">atau</div>
        <form action={signInWithGoogle}><input type="hidden" name="next" value={next}/><AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4" /> Lanjut dengan Google</AuthSubmit></form>
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground"><Link href="/register" className="font-semibold text-primary">Buat akun</Link><span> · </span><Link href="/reset-password" className="underline">Lupa password?</Link></p>
      </section>
      <p className="mt-6 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><ScanLine size={18} className="shrink-0" /> Akun PassFlow dan pendaftaran event berbeda. Hak akses event mengikuti pass yang terdaftar untukmu.</p>
    </div>
  </main>;
}
