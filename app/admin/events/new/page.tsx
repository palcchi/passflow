export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEvent } from "@/app/admin/actions";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { requireOrganizer } from "@/lib/auth/session";
import { UserNavbar } from "@/components/user-navbar";
import { eventAdminProfile } from "@/components/event-admin-chrome";
import { FolderArtwork, Sticker } from "@/components/flow-brand-art";
import { AuthSubmit } from "@/components/auth-submit";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user } = await requireOrganizer();
  return (
    <div className="app-surface flow-workspace min-h-screen">
      <UserNavbar {...eventAdminProfile(user)} organizer/>
      <main className="create-event-layout">
        <Link href="/admin" className="auth-back"><ArrowLeft size={16} /> Kembali ke organizer</Link>
        <header className="studio-page-hero"><div><span className="section-kicker">SOMETHING GOOD STARTS HERE</span><h1 className="studio-page-title">Dari ide, jadi event.</h1><p className="studio-page-subtitle">Mulai dari detail dasarnya. Event disimpan sebagai draft sampai kamu siap mempublikasikannya.</p></div><div className="workspace-art"><FolderArtwork color="orange" label="A fresh start"/><Sticker kind="check"/></div></header>

        {params.error && <p className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">Event belum berhasil dibuat. Periksa nama dan slug.</p>}

        <form action={createEvent} className="create-event-form grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Nama event
            <input name="name" required maxLength={120} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="Beri nama momenmu" />
          </label>
          <label className="block text-sm font-medium">Slug
            <input name="slug" maxLength={100} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="nama-event-kamu" />
            <small className="mt-2 block text-xs font-normal text-muted-foreground">Alamat event. Kosongkan untuk membuat otomatis.</small>
          </label>
          <label className="block text-sm font-medium">Lokasi
            <input name="venue" maxLength={160} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="Nama venue atau lokasi" />
          </label>
          <DateTimeField name="startsAt" label="Mulai" />
          <DateTimeField name="endsAt" label="Selesai" />
          <label className="block text-sm font-medium">Kapasitas peserta
            <FormattedNumberInput name="capacity" min={0} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="500" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Tentang event
            <textarea name="description" maxLength={1200} rows={5} className="mt-2 w-full rounded-md border border-input bg-background p-3" />
          </label>
          <div className="sm:col-span-2"><AuthSubmit>Buat draft event ↗</AuthSubmit></div>
        </form>
      </main>
    </div>
  );
}
