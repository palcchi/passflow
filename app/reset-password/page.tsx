import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { ThemeToggle } from "@/components/theme-toggle";
import { requestPasswordReset } from "@/app/auth/actions";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const ready = !!getSupabaseConfig() && !!getAppOrigin();
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-4">
          <Link href="/login" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft size={16} /> Kembali ke login
          </Link>
          <ThemeToggle />
        </div>
        <section className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pemulihan akun</p>
          <h1 className="auth-title mt-3 text-4xl font-semibold tracking-tight">Lupa password?</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Masukkan email terdaftar. Jika cocok, tautan password baru akan dikirim.
          </p>
          <form action={requestPasswordReset} className="mt-7 space-y-3">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3">
              <Mail size={16} className="text-muted-foreground" />
              <span className="sr-only">Email</span>
              <input required name="email" type="email" autoComplete="email" placeholder="email@contoh.com" className="min-h-11 w-full bg-transparent text-sm outline-none" />
            </label>
            <AuthSubmit disabled={!ready}>Kirim tautan reset</AuthSubmit>
          </form>
        </section>
      </div>
    </main>
  );
}
