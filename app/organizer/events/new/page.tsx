export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEvent } from "@/app/organizer/events/actions";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { NewEventSubdomainField } from "@/components/new-event-subdomain-field";
import { VenueField } from "@/components/venue-field";
import { requireOrganizer } from "@/lib/auth/session";
import { canCreateEvent, EVENTS_PER_ORGANIZER } from "@/lib/organizer-quota";
import { AppShell } from "@/components/app-shell";
import { eventAdminProfile } from "@/components/event-admin-chrome";

export const metadata = { title: "New event" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireOrganizer();
  const allowed = await canCreateEvent(supabase, user);
  return (
    <AppShell {...eventAdminProfile(user)} organizer narrow>
      <Link href="/organizer/events" className="ui-back"><ArrowLeft size={14} />All events</Link>
      <header className="ui-pagehead ui-mt">
        <div>
          <h1 className="ui-h1">New event</h1>
          <p className="ui-lead">Start with the essentials. It stays a draft until you publish, and you can change everything later.</p>
        </div>
      </header>

      {params.error && params.error !== "limit" && <p role="alert" className="ui-notice ui-notice-danger ui-mb">{params.error === "slug" ? "An event with these details already exists. Choose a different event name." : params.error === "subdomain" ? "That event subdomain is invalid or already reserved. Choose another address." : params.error === "invalid" ? "Enter a valid event name and subdomain." : "The event could not be created. Check the details and try again."}</p>}

      {!allowed ? (
        <section className="ui-empty">
          <strong>You already have an active event</strong>
          <p>Each organizer account runs {EVENTS_PER_ORGANIZER} event at a time. When it is over, archive it in Settings and you can create the next one.</p>
          <Link className="ui-btn ui-btn-primary ui-btn-sm" href="/organizer/events">Back to your event</Link>
        </section>
      ) : (
        <form action={createEvent} className="ui-card ui-formgrid ui-newevent">
          <label className="ui-field ui-span-2"><span>Event name</span><input className="ui-input" name="name" required maxLength={120} placeholder="Jakarta Design Week 2026" /></label>
          <NewEventSubdomainField />
          <label className="ui-field"><span>Capacity</span><FormattedNumberInput name="capacity" min={0} className="ui-input" placeholder="Unlimited" /></label>
          <VenueField />
          <div className="ui-span-2 ui-dates"><DateTimeField name="startsAt" label="Starts" /><DateTimeField name="endsAt" label="Ends" /></div>
          <label className="ui-field ui-span-2"><span>About the event</span><textarea className="ui-textarea" name="description" maxLength={1200} rows={4} placeholder="Who it is for and what to expect" /></label>
          <div className="ui-span-2 ui-formactions"><Link href="/organizer/events" className="ui-btn ui-btn-ghost">Cancel</Link><button type="submit" className="ui-btn ui-btn-primary">Create draft</button></div>
        </form>
      )}
    </AppShell>
  );
}
