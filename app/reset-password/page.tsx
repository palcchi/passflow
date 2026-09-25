import { LockKeyhole } from "lucide-react";
import { updatePassword } from "@/app/auth/actions";
import { AuthSubmit } from "@/components/auth-submit";
import { requireUser } from "@/lib/auth/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";

export const metadata = { title: "Password baru" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  password: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
  mismatch: "Konfirmasi password tidak sama.",
  unavailable: "Supabase belum terhubung.",
  update: "Password belum berhasil diperbarui. Coba gunakan link reset yang baru.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("/reset-password");
  const params = await searchParams;
  const message = typeof params.error === "string" ? errors[params.error] : null;

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-md">
        <section className="mt-10 rounded-lg border border-border bg-card p-6 sm:p-9">
          <span className="brand-mark mb-8">P</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Secure account</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Buat password baru.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Link pemulihan sudah diverifikasi. Sekarang pilih password baru untuk akunmu.
          </p>
          {message && <p role="alert" className="mt-6 text-sm text-destructive">{message}</p>}

          <form action={updatePassword} className="mt-7 space-y-4">
            <label className="block text-sm font-medium">
              Password baru
              <div className="mt-2 flex min-h-12 items-center gap-3 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <LockKeyhole size={17} className="text-muted-foreground" aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={128}
                  required
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
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={128}
                  required
                />
              </div>
            </label>

            <AuthSubmit>Simpan password baru</AuthSubmit>
          </form>
        </section>
      </div>
    </main>
  );
}
