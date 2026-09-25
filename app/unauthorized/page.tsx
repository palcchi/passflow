import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function UnauthorizedPage() {
  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="max-w-md rounded-lg border border-border bg-card p-7">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Akses terbatas</p>
      <h1 className="mt-3 text-3xl tracking-tight">Halaman ini belum tersedia untuk akunmu.</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Hubungi organizer untuk memastikan penugasan dan hak aksesmu. Jika kamu baru bergabung, akunmu memiliki akses pengunjung.</p>
      <Button asChild className="mt-7"><Link href="/account">Kembali ke akun</Link></Button>
    </section>
  </main>;
}
