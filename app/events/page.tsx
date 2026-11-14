import Link from "next/link";
import { accountProfile, getAuthContext, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getMyRegistrations, getPublishedEvents } from "@/lib/events";
import { AppShell } from "@/components/app-shell";
import { EventCollection } from "@/components/event-collection";
import { MarketingNav, MarketingFooter } from "@/components/marketing-chrome";

export const metadata = { title: "Discover events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const context = await getAuthContext();
  const registrations = context
    ? await getMyRegistrations(context.supabase, context.user.id).catch(() => ({}))
    : {};
  const events = await getPublishedEvents(Object.keys(registrations)).catch(() => []);
  const { memberships } = context ? await getMemberships() : { memberships: [] };

  if (!context) {
    return (
      <div className="ui-app ui-mk">
        <MarketingNav signedIn={false} />
        <main id="main" className="ui-mk-section">
          <header className="ui-pagehead">
            <div>
              <h1 className="ui-h1">Discover events.</h1>
              <p className="ui-lead">Explore public events. Sign in when you are ready to register and keep your pass in one place.</p>
            </div>
            <Link href="/login?next=%2Fevents" className="ui-btn ui-btn-primary">Sign in</Link>
          </header>
          <EventCollection events={events} />
        </main>
        <MarketingFooter signedIn={false} />
      </div>
    );
  }

  const { name, avatarUrl } = accountProfile(context.user);
  return (
    <AppShell name={name || "Attendee"} email={context.user.email} avatarUrl={avatarUrl} organizer={memberships.some((m) => canManage(m.role))}>
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
