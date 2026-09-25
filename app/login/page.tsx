import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { signInWithPassword } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unavailable: "Login belum tersedia. Konfigurasi Supabase belum terhubung.",
  invalid: "Masukkan email dan password yang valid.",
  credentials: "Email atau password tidak cocok.",
  unverified: "Email belum diverifikasi. Buka email verifikasi yang dikirim saat pendaftaran.",
  signout: "Belum berhasil keluar. Silakan kembali ke akun dan coba lagi.",
  recovery: "Tautan pemulihan tidak valid atau sudah kedaluwarsa.",
  callback: "Tautan verifikasi tidak valid, sudah dipakai, atau sudah kedaluwarsa.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const ready = !!getSupabaseConfig();
  const message = typeof params.error === "string" ? errors[params.error] : null;

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Kembali ke PassFlow
        </Link>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 sm:p-9">
          <span className="brand-mark mb-8">P</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Welcome back</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Masuk ke PassFlow.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Gunakan email dan password yang sudah kamu daftarkan.
          </p>

          {message && (
            <p role="alert" className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
              {message}
            </p>
          )}
          {params.notice === "signed-out" && (
            <p role="status" className="mt-6 text-sm text-success">Kamu sudah keluar dari perangkat ini.</p>
          )}
          {!ready && (
            <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Login sedang disiapkan. Halaman event publik tetap bisa dijelajahi.
            </p>
          )}

          <form action={signInWithPassword} className="mt-7 space-y-4">
            <input type="hidden" name="next" value={next} />

            <label className="block text-sm font-medium">
              Email
              <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Mail size={17} className="text-muted-foreground" aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={254}
                  placeholder="nama@email.com"
                />
              </div>
            </label>

            <label className="block text-sm font-medium">
              Password
              <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <LockKeyhole size={17} className="text-muted-foreground" aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  placeholder="Password"
                />
              </div>
            </label>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Lupa password?
              </Link>
            </div>

            <AuthSubmit disabled={!ready}>Masuk</AuthSubmit>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-foreground hover:underline">
              Buat akun
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
