import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { AuthSubmit } from "@/components/auth-submit";
import { signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Masuk atau daftar" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  unavailable: "Login belum tersedia. Silakan coba lagi nanti.",
  provider: "Belum bisa terhubung ke Google. Silakan coba lagi.",
  callback: "Proses masuk dibatalkan atau tautannya sudah kedaluwarsa. Silakan coba lagi.",
  signout: "Belum berhasil keluar. Silakan kembali ke akun dan coba lagi.",
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
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Masuk atau daftar dengan akun Google untuk melanjutkan perjalanan event kamu.</p>
        {message && <p role="alert" className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{message}</p>}
        {params.notice === "signed-out" && <p role="status" className="mt-6 text-sm text-success">Kamu sudah keluar dari perangkat ini.</p>}
        {!ready && <p role="status" className="mt-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">Login sedang disiapkan. Halaman event tetap bisa kamu jelajahi.</p>}
        <form action={signInWithGoogle} className="mt-7">
          <input type="hidden" name="next" value={next} />
          <AuthSubmit disabled={!ready}><span aria-hidden="true" className="font-bold">G</span> Lanjutkan dengan Google</AuthSubmit>
        </form>
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Pertama kali di sini? Akun pengunjung dibuat otomatis saat kamu masuk. Tidak perlu membuat password baru.</p>
      </section>
      <p className="mt-6 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><ScanLine size={18} className="shrink-0" /> Akun PassFlow dan pendaftaran event berbeda. Hak akses event mengikuti pass yang terdaftar untukmu.</p>
    </div>
  </main>;
}
