export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEvent } from "@/app/organizer/events/actions";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { requireOrganizer } from "@/lib/auth/session";
import { canCreateEvent, EVENTS_PER_ORGANIZER } from "@/lib/organizer-quota";
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
  const { supabase, user } = await requireOrganizer();
  const allowed = await canCreateEvent(supabase, user);
  return (
    <div className="app-surface flow-workspace min-h-screen">
      <UserNavbar {...eventAdminProfile(user)} organizer/>
      <main className="create-event-layout">
        <Link href="/organizer/events" className="auth-back"><ArrowLeft size={16} /> Back to organizer</Link>
        <header className="studio-page-hero"><div><span className="section-kicker">SOMETHING GOOD STARTS HERE</span><h1 className="studio-page-title">Turn an idea into an event.</h1><p className="studio-page-subtitle">Start with the essentials. Your event remains a draft until you are ready to publish.</p></div><div className="workspace-art"><FolderArtwork color="orange" label="A fresh start"/><Sticker kind="check"/></div></header>

        {params.error && params.error !== "limit" && <p className="mt-6 rounded-md border border-destructive/30 p-3 text-sm text-destructive">The event could not be created. Review the event name and URL slug, then try again.</p>}

        {!allowed ? <section className="event-admin-section event-limit-card">
          <span className="section-kicker">One event at a time</span>
          <h2>You already have an active event.</h2>
          <p>Each organizer account runs {EVENTS_PER_ORGANIZER} event at a time. When it is over, archive it in its Settings and you can create the next one.</p>
          <Link className="button button-dark" href="/organizer/events">Back to your event</Link>
        </section> : <>

        <form action={createEvent} className="create-event-form grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Event name
            <input name="name" required maxLength={120} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="PassFlow Summit 2026" />
          </label>
          <label className="block text-sm font-medium">Slug
            <input name="slug" maxLength={100} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="passflow-summit-2026" />
            <small className="mt-2 block text-xs font-normal text-muted-foreground">Public event URL. Leave blank to generate it automatically.</small>
          </label>
          <label className="block text-sm font-medium">Venue
            <input name="venue" maxLength={160} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="Jakarta Convention Center" />
          </label>
          <DateTimeField name="startsAt" label="Start date & time" />
          <DateTimeField name="endsAt" label="End date & time" />
          <label className="block text-sm font-medium">Attendee capacity
            <FormattedNumberInput name="capacity" min={0} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" placeholder="500" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">About the event
            <textarea name="description" maxLength={1200} rows={5} className="mt-2 w-full rounded-md border border-input bg-background p-3" placeholder="Add a concise description of the event experience, audience, and key details." />
          </label>
          <div className="sm:col-span-2"><AuthSubmit>Create draft event ↗</AuthSubmit></div>
        </form>
        </>}
      </main>
    </div>
  );
}
