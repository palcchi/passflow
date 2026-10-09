import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getMyRegistrations, getPublishedEvents } from "@/lib/events";
import { AppShell } from "@/components/app-shell";
import { EventClassCard } from "@/components/event-class-card";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, supabase } = await requireUser();
  const { name: accountName, avatarUrl } = accountProfile(user);
  const name = accountName || "there";
  const [{ memberships, unavailable }, registrations] = await Promise.all([getMemberships(), getMyRegistrations(supabase, user.id)]);
  const publishedEvents = await getPublishedEvents(Object.keys(registrations)).catch(() => []);
  const organizer = memberships.some((membership) => canManage(membership.role));

  const myEvents = publishedEvents.filter((event) => registrations[event.id]);
  const suggestions = publishedEvents.filter((event) => !registrations[event.id]).slice(0, 3);
  const pending = myEvents.filter((event) => registrations[event.id] === "pending").length;

  return (
    <AppShell name={accountName || "Attendee"} email={user.email} avatarUrl={avatarUrl} organizer={organizer}>
      <header className="ui-pagehead ui-rise">
        <div>
          <h1 className="ui-h1">Hi, {name.split(" ")[0]}.</h1>
          <p className="ui-lead">
            {myEvents.length
              ? `You have ${myEvents.length} ${myEvents.length === 1 ? "event" : "events"} in your account${pending ? `, ${pending} waiting for approval` : ""}.`
              : "Your passes live here once you register for an event."}
          </p>
        </div>
        <div className="ui-row">
          {organizer && <Link href="/organizer/events" className="ui-btn ui-btn-secondary">Organizer workspace</Link>}
          <Link href="/events" className="ui-btn ui-btn-primary">Discover events</Link>
        </div>
      </header>

      {unavailable && <p role="alert" className="ui-notice ui-notice-danger">We could not load your organizer access. Refresh to try again.</p>}

      <section className="ui-section ui-rise ui-rise-2" aria-labelledby="my-events">
        <div className="ui-sectionhead"><h2 id="my-events" className="ui-h2">Your passes</h2></div>
        {myEvents.length === 1 ? (
          <EventClassCard event={myEvents[0]} registration={registrations[myEvents[0].id]} featured />
        ) : myEvents.length ? (
          <div className="ui-eventgrid">{myEvents.map((event) => <EventClassCard key={event.id} event={event} registration={registrations[event.id]} />)}</div>
        ) : (
          <div className="ui-empty">
            <strong>No passes yet</strong>
            <p>Find an event you like and register. Your QR pass appears here right away, or after the organizer approves you.</p>
            <Link href="/events" className="ui-btn ui-btn-primary ui-btn-sm">Discover events</Link>
          </div>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="ui-section ui-rise ui-rise-3" aria-labelledby="suggested">
          <div className="ui-sectionhead">
            <h2 id="suggested" className="ui-h2">Happening on PassFlow</h2>
            <Link href="/events" className="ui-link">See all <ArrowRight size={15} /></Link>
          </div>
          <div className="ui-eventgrid">{suggestions.map((event) => <EventClassCard key={event.id} event={event} />)}</div>
        </section>
      )}
    </AppShell>
  );
}
