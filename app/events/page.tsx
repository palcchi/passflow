import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getMyRegistrations, getPublishedEvents } from "@/lib/events";
import { AppShell } from "@/components/app-shell";
import { EventCollection } from "@/components/event-collection";

export const metadata = { title: "Discover events" };

export default async function EventsPage() {
  const { user, supabase } = await requireUser("/events");
  const { name, avatarUrl } = accountProfile(user);
  const [{ memberships }, registrations] = await Promise.all([getMemberships(), getMyRegistrations(supabase, user.id)]);
  const events = await getPublishedEvents(Object.keys(registrations)).catch(() => []);

  return (
    <AppShell name={name || "Attendee"} email={user.email} avatarUrl={avatarUrl} organizer={memberships.some((m) => canManage(m.role))}>
      <header className="ui-pagehead ui-rise">
        <div>
          <h1 className="ui-h1">Discover events.</h1>
          <p className="ui-lead">Register once and your pass lives in your PassFlow account, ready at the door.</p>
        </div>
      </header>
      <EventCollection events={events} registrations={registrations} />
    </AppShell>
  );
}
