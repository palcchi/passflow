export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEvent } from "@/app/admin/actions";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:py-12">
      <section className="mx-auto max-w-3xl">
        <Link href="/admin" className="back-link"><ArrowLeft size={16} /> Back to dashboard</Link>
        <div className="mt-8">
          <span className="section-kicker">Create event</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">New PassFlow event.</h1>
          <p className="mt-3 text-muted-foreground">Event dibuat sebagai draft. Publish setelah ticket type dan konfigurasi dasarnya siap.</p>
        </div>

        {params.error && <p className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">Event belum berhasil dibuat. Periksa nama dan slug.</p>}

        <form action={createEvent} className="mt-8 grid gap-5 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Event name
            <input name="name" required maxLength={120} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="Adorne Nails Exhibition" />
          </label>
          <label className="block text-sm font-medium">Slug
            <input name="slug" maxLength={100} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="adorne-nails-exhibition" />
          </label>
          <label className="block text-sm font-medium">Venue
            <input name="venue" maxLength={160} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="Adorne Studio" />
          </label>
          <DateTimeField name="startsAt" label="Starts at" />
          <DateTimeField name="endsAt" label="Ends at" />
          <label className="block text-sm font-medium">Capacity
            <FormattedNumberInput name="capacity" min={0} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="500" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Description
            <textarea name="description" maxLength={1200} rows={5} className="mt-2 w-full rounded-md border border-input bg-background p-3" />
          </label>
          <button type="submit" className="button button-dark sm:col-span-2">Create draft event</button>
        </form>
      </section>
    </main>
  );
}
