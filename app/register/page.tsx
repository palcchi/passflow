import Link from "next/link";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { signInWithGoogle, signUpWithEmail } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Buat akun | PassFlow" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const ready = !!getSupabaseConfig() && !!getAppOrigin();

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-7 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950">
          <ArrowLeft size={16} /> Kembali
        </Link>

        <section className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] sm:p-9">
          <span className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-sm font-bold text-white">P</span>
          <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">Buat akun PassFlow.</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Satu akun untuk event, pass, dan akses kamu.</p>

          {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Periksa username, email, dan password lalu coba lagi.</p>}
          {params.notice === "check-email" && <p role="status" className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">Cek email untuk menyelesaikan verifikasi akun.</p>}

          <form action={signUpWithEmail} className="mt-7 space-y-3">
            <input type="hidden" name="next" value={next} />
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
              <UserRound size={17} className="text-muted-foreground" aria-hidden="true" />
              <label htmlFor="register-username" className="sr-only">Username</label>
              <input id="register-username" required name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" placeholder="Username" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <p className="text-xs text-neutral-500">3–24 karakter, huruf, angka, atau garis bawah. Nama tampilan ini belum unik.</p>
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
              <Mail size={17} className="text-muted-foreground" aria-hidden="true" />
              <label htmlFor="register-email" className="sr-only">Email</label>
              <input
                id="register-email"
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <PasswordField autoComplete="new-password" placeholder="Password minimal 8 karakter" />
            <AuthSubmit disabled={!ready}>Buat akun</AuthSubmit>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-neutral-400 before:h-px before:flex-1 before:bg-neutral-200 after:h-px after:flex-1 after:bg-neutral-200">atau</div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4" /> Daftar dengan Google</AuthSubmit>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-500">
            Sudah punya akun?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-neutral-950">Masuk</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
