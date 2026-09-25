import Link from "next/link";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { AuthSubmit } from "@/components/auth-submit";
export const metadata = { title: "Akun saya" };
export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { user } = await requireUser();
  const { memberships, unavailable } = await getMemberships();
  const organizer = memberships.some((m) => canManage(m.role));
  const name = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Pengunjung PassFlow";
  return <main className="min-h-screen px-5 py-10">
    <section className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 sm:p-9">
      <Link href="/" className="text-sm font-bold">PassFlow</Link>
      <p className="mt-10 text-xs uppercase tracking-widest text-muted-foreground">Akun saya</p>
      <h1 className="mt-3 break-words text-3xl tracking-tight">Halo, {name}.</h1>
      <p className="mt-3 break-all text-sm text-muted-foreground">{user.email}</p>
      {params.notice === "password-updated" && <p role="status" className="mt-6 rounded-md border border-success/30 p-4 text-sm text-success">Password berhasil diperbarui.</p>}
      <p className="mt-6 rounded-md bg-muted p-4 text-sm leading-6">Akunmu sudah siap. Pendaftaran event dan penghubungan wristband akan tersedia pada tahap berikutnya.</p>
      {unavailable && <p role="alert" className="mt-4 text-sm text-destructive">Hak akses belum dapat dimuat. Silakan coba lagi nanti.</p>}
      {!unavailable && <p className="mt-4 text-sm">Akses: {organizer ? "Organizer" : memberships.length ? "Staff" : "Pengunjung"}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        {organizer && <Button asChild><Link href="/admin">Buka dashboard</Link></Button>}
        <Button asChild variant="outline"><Link href="/e/discoveries-2026">Lihat event demo</Link></Button>
      </div>
      {memberships.length > 0 && !organizer && <p className="mt-4 text-sm text-muted-foreground">Gunakan tautan Scanner Station dari organizer untuk bertugas.</p>}
      <form action={signOut} className="mt-8"><AuthSubmit>Keluar</AuthSubmit></form>
    </section>
  </main>;
}
