import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { signUpWithPassword } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";

export const metadata = { title: "Daftar" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unavailable: "Pendaftaran belum tersedia. Konfigurasi Supabase belum terhubung.",
  name: "Masukkan nama lengkap yang valid.",
  email: "Masukkan alamat email yang valid.",
  password: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
  mismatch: "Konfirmasi password tidak sama.",
  signup: "Akun belum dapat dibuat. Periksa data atau gunakan email lain, lalu coba lagi.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  const checkEmail = params.notice === "check-email";

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Kembali ke PassFlow
        </Link>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 sm:p-9">
          <span className="brand-mark mb-8">P</span>

          {checkEmail ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Verify your email</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cek inbox kamu.</h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Kami sudah mengirim email verifikasi. Buka tautan di email tersebut untuk mengaktifkan akun PassFlow,
                lalu kamu akan masuk ke akunmu.
              </p>
              <div className="mt-7 rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Belum masuk? Cek folder spam atau tunggu beberapa saat sebelum mencoba daftar ulang.
              </div>
              <Link href="/login" className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border font-semibold">
                Kembali ke login
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Create account</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Buat akun PassFlow.</h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Akun baru otomatis menjadi pengunjung. Role staff dan organizer hanya dapat diberikan oleh organizer.
              </p>

              {message && (
                <p role="alert" className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
                  {message}
                </p>
              )}
              {!ready && (
                <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Pendaftaran sedang disiapkan. Sambungkan Supabase untuk mengaktifkannya.
                </p>
              )}

              <form action={signUpWithPassword} className="mt-7 space-y-4">
                <input type="hidden" name="next" value={next} />

                <label className="block text-sm font-medium">
                  Nama lengkap
                  <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <UserRound size={17} className="text-muted-foreground" aria-hidden="true" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Nama lengkap"
                    />
                  </div>
                </label>

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
                      autoComplete="new-password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={128}
                      placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                    />
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  Konfirmasi password
                  <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <LockKeyhole size={17} className="text-muted-foreground" aria-hidden="true" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={128}
                      placeholder="Ulangi password"
                    />
                  </div>
                </label>

                <AuthSubmit disabled={!ready}>Buat akun</AuthSubmit>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-foreground hover:underline">
                  Masuk
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
