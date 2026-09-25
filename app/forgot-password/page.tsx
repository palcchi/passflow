import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthSubmit } from "@/components/auth-submit";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Lupa password" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  email: "Masukkan alamat email yang valid.",
  unavailable: "Pemulihan password belum tersedia. Konfigurasi Supabase belum terhubung.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  const message = typeof params.error === "string" ? errors[params.error] : null;
  const sent = params.notice === "sent";

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Kembali ke login
        </Link>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 sm:p-9">
          <span className="brand-mark mb-8">P</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Account recovery</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Reset password.</h1>

          {sent ? (
            <p role="status" className="mt-5 rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Jika email tersebut terdaftar, link reset password sudah dikirim. Cek inbox dan folder spam.
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Masukkan email akunmu. Kami akan mengirim link aman untuk membuat password baru.
              </p>
              {message && <p role="alert" className="mt-6 text-sm text-destructive">{message}</p>}
              <form action={requestPasswordReset} className="mt-7 space-y-4">
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
                <AuthSubmit disabled={!ready}>Kirim link reset</AuthSubmit>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
