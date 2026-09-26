import Link from "next/link";
import { ArrowLeft, ExternalLink, Figma, UserRound } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { figmaConfigured } from "@/lib/figma";
import { signOut } from "@/app/auth/actions";
import { saveUsername } from "./actions";

export const metadata = { title: "Profil | PassFlow" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireUser("/profile");
  const [{ data: connection, error: connectionError }, { memberships }, query] = await Promise.all([
    supabase.from("figma_connections").select("handle,email,expires_at").eq("user_id", user.id).maybeSingle(),
    getMemberships(),
    searchParams,
  ]);
  const username = typeof user.user_metadata.username === "string" ? user.user_metadata.username : "";
  const name = username || (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "") || user.email?.split("@")[0] || "Pengunjung";
  const organizer = memberships.some(item => canManage(item.role));
  const status = query.status;
  const figma = query.figma;
  const figmaErrors: Record<string, string> = {
    "not-configured": "Konfigurasi Figma di server belum lengkap. Periksa variabel lingkungan Vercel.",
    "invalid-state": "Sesi koneksi berubah. Buka PassFlow dan Figma di browser yang sama, lalu coba lagi.",
    "missing-code": "Figma belum mengirim kode akses. Coba ulangi koneksi.",
    cancelled: "Permintaan akses Figma dibatalkan. Kamu bisa menghubungkannya kapan saja.",
    "token-error": "Kode akses Figma ditolak atau kedaluwarsa. Ulangi koneksi dan selesaikan izin segera.",
    "profile-error": "PassFlow belum bisa membaca akun Figma. Periksa izin aplikasi di Figma.",
    "database-error": "Izin Figma diterima, tetapi koneksi belum tersimpan. Coba hubungkan kembali.",
    error: "Koneksi Figma belum berhasil. Coba lagi.",
  };
  return <div className="min-h-screen bg-[#fafafa] text-neutral-950">
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-4 px-5">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft size={17}/> Dashboard</Link>
        <span className="text-sm font-semibold">PassFlow.</span>
        {organizer ? <Link href="/admin" className="text-sm text-neutral-600">Organizer</Link> : <span className="w-16"/>}
      </div>
    </header>
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:py-14">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Akun</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Profil kamu</h1><p className="mt-2 text-sm text-neutral-500">Atur nama yang tampil dan sambungkan akun desain.</p></div>
      {(status === "invalid" || status === "error") && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{status === "invalid" ? "Username harus 3–24 karakter, hanya huruf, angka, atau garis bawah." : "Profil belum tersimpan. Silakan coba lagi."}</p>}
      {status === "saved" && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Username berhasil disimpan.</p>}
      {figma === "connected" && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Akun Figma berhasil dihubungkan.</p>}
      {figma === "disconnected" && <p role="status" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">Koneksi Figma diputus.</p>}
      {typeof figma === "string" && figmaErrors[figma] && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{figmaErrors[figma]}</p>}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-neutral-100"><UserRound size={20}/></span><div><h2 className="font-semibold">Identitas</h2><p className="text-sm text-neutral-500">{name}</p></div></div>
        <form action={saveUsername} className="mt-7 space-y-4">
          <label htmlFor="profile-username" className="block text-sm font-medium">Username</label>
          <input id="profile-username" name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" defaultValue={username} placeholder="Username kamu" className="min-h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-neutral-950"/>
          <p className="text-xs text-neutral-500">3–24 karakter, huruf, angka, atau garis bawah. Username adalah nama tampilan, belum unik.</p>
          <p className="text-sm text-neutral-500">Email: <span className="font-medium text-neutral-950">{user.email}</span></p>
          <button className="min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800" type="submit">Simpan username</button>
        </form>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-neutral-100"><Figma size={20}/></span><div><h2 className="font-semibold">Koneksi Figma</h2><p className="text-sm text-neutral-500">{connection ? connection.handle ?? connection.email ?? "Akun terhubung" : "Belum terhubung"}</p></div></div>
        {connectionError && <p role="alert" className="mt-4 text-sm text-red-700">Status Figma belum dapat dimuat. Coba muat ulang halaman.</p>}
        <p className="mt-5 text-sm leading-6 text-neutral-500">Hubungkan akun Figma untuk membaca identitas akun, metadata, dan isi file desain event. PassFlow tidak meminta izin mengubah file atau komentar. Desain tetap dapat diedit di Figma.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {connection ? <><a href="/api/figma/connect" className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm font-medium">Hubungkan ulang</a><form action="/api/figma/disconnect" method="post"><button type="submit" className="min-h-11 rounded-xl px-4 text-sm text-red-700">Putuskan koneksi</button></form></>
            : <a href="/api/figma/connect" aria-disabled={!figmaConfigured()} className="inline-flex min-h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white">Hubungkan Figma <ExternalLink size={15} className="ml-2"/></a>}
        </div>
        {organizer && <Link href="/admin" className="mt-5 inline-block text-sm font-medium underline underline-offset-4">Kelola desain event</Link>}
      </section>
      <form action={signOut}><button type="submit" className="min-h-11 text-sm text-neutral-500 underline underline-offset-4">Keluar dari akun</button></form>
    </main>
  </div>;
}
