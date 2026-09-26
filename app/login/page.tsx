import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { resendSignupConfirmation, signInWithEmail, signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Masuk | PassFlow" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unavailable: "Login belum tersedia. Silakan coba lagi nanti.",
  provider: "Permintaan belum bisa diproses. Silakan coba lagi.",
  invalid: "Email atau password tidak cocok.",
  unverified: "Email belum diverifikasi. Kirim ulang tautan verifikasi di bawah.",
  expired: "Sesi sudah berakhir. Silakan masuk lagi.",
  "figma-session": "Sesi PassFlow tidak terbaca setelah kembali dari Figma. Masuk lagi di browser yang sama, lalu ulangi koneksi dari Profil.",
  callback: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa.",
  signout: "Belum berhasil keluar. Silakan coba lagi.",
  reset: "Password baru sudah disimpan.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-7 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950">
          <ArrowLeft size={16} /> Kembali
        </Link>

        <section className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] sm:p-9">
          <span className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-sm font-bold text-white">P</span>
          <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">Selamat datang kembali.</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Masuk untuk melihat event dan pass kamu.</p>

          {message && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>}
          {params.notice === "signed-out" && <p role="status" className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">Kamu sudah keluar.</p>}
          {params.notice === "verification-sent" && <p role="status" className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">Tautan verifikasi baru sudah dikirim.</p>}
          {params.notice === "reset-sent" && <p role="status" className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">Jika email terdaftar, tautan reset sudah dikirim.</p>}

          <form action={signInWithEmail} className="mt-7 space-y-3">
            <input type="hidden" name="next" value={next} />
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
              <Mail size={17} className="text-muted-foreground" aria-hidden="true" />
              <label htmlFor="login-email" className="sr-only">Email</label>
              <input
                id="login-email"
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <PasswordField autoComplete="current-password" />
            <AuthSubmit disabled={!ready}>Masuk</AuthSubmit>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-neutral-400 before:h-px before:flex-1 before:bg-neutral-200 after:h-px after:flex-1 after:bg-neutral-200">atau</div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4" /> Lanjut dengan Google</AuthSubmit>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-xs">
            <Link href="/register" className="font-semibold text-neutral-950">Buat akun</Link>
            <Link href="/reset-password" className="text-neutral-500 hover:text-neutral-950">Lupa password?</Link>
          </div>

          {params.error === "unverified" && (
            <form action={resendSignupConfirmation} className="mt-6 space-y-3 border-t border-neutral-100 pt-5">
              <input type="hidden" name="next" value={next} />
              <input required name="email" type="email" autoComplete="email" placeholder="Email untuk kirim ulang" className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" />
              <AuthSubmit disabled={!ready} variant="outline">Kirim ulang verifikasi</AuthSubmit>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
