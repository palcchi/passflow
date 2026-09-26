import Link from "next/link";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/password-field";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <main className="min-h-screen bg-background px-5 py-7 text-foreground sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <ThemeToggle />
        </div>

        <section className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-9">
          <span className="brand-mark">P</span>
          <h1 className="auth-title mt-8 text-3xl font-semibold tracking-[-0.04em]">Buat akun PassFlow.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Satu akun untuk event, pass, dan akses kamu.</p>

          {params.error && <p role="alert" className="mt-5 rounded-lg border border-red-200/40 bg-red-500/10 p-3 text-sm text-destructive">Periksa username, email, dan password lalu coba lagi.</p>}
          {params.notice === "check-email" && <p role="status" className="mt-5 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Cek email untuk menyelesaikan verifikasi akun.</p>}

          <form action={signUpWithEmail} className="mt-7 space-y-3">
            <input type="hidden" name="next" value={next} />
            <div className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background px-3">
              <UserRound size={17} className="text-muted-foreground" aria-hidden="true" />
              <label htmlFor="register-username" className="sr-only">Username</label>
              <input id="register-username" required name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" placeholder="Username" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <p className="text-xs text-muted-foreground">3–24 karakter, huruf, angka, atau garis bawah. Nama tampilan ini belum unik.</p>
            <div className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background px-3">
              <Mail size={17} className="text-muted-foreground" aria-hidden="true" />
              <label htmlFor="register-email" className="sr-only">Email</label>
              <input id="register-email" required name="email" type="email" autoComplete="email" placeholder="Email" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <PasswordField autoComplete="new-password" placeholder="Password minimal 8 karakter" />
            <AuthSubmit disabled={!ready}>Buat akun</AuthSubmit>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">atau</div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <AuthSubmit disabled={!ready} variant="outline"><GoogleIcon className="size-4" /> Daftar dengan Google</AuthSubmit>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-foreground">Masuk</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
