import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { EventClassCard } from "@/components/event-class-card";
import { HeroCardFan } from "@/components/hero-card-fan";
import { FolderArtwork } from "@/components/flow-brand-art";

export const metadata = { title: "Dashboard | PassFlow" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, supabase } = await requireUser();
  const { name: accountName, avatarUrl } = accountProfile(user);
  const name = accountName || "Attendee";

  const [
    { memberships, unavailable },
    registrationsResult,
    publishedEvents,
  ] = await Promise.all([
    getMemberships(),
    supabase.from("attendees").select("event_id").eq("user_id", user.id),
    getPublishedEvents().catch(() => []),
  ]);

  const organizer = memberships.some((membership) =>
    canManage(membership.role),
  );
  const registeredIds = new Set(
    (registrationsResult.data ?? []).map((item) => item.event_id),
  );
  const myEvents = publishedEvents.filter((event) =>
    registeredIds.has(event.id),
  );

  return (
    <div className="app-surface flow-workspace studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero workspace-welcome">
          <div className="workspace-welcome-copy">
            <span className="editorial-eyebrow"><span/> YOUR EVENTS & PASSES</span>
            <KineticText text={`Welcome, ${name}.`} className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle" delay={0.05}>
              Your events and digital passes are organized here, ready when you need them.
            </TextAnimate>
          <Link href="/events" className="magic-shiny-button">
            <span>
            <Plus size={17} />
            Explore events
            </span>
          </Link>
          </div>
          <div className="workspace-fan"><HeroCardFan events={myEvents.length ? myEvents : publishedEvents} compact/></div>
        </header>

        {unavailable && (
          <p role="alert" className="studio-status is-error">
            We could not load your account permissions.
          </p>
        )}

        <section className="studio-section" aria-labelledby="my-events">
          <div className="studio-section-heading">
            <div>
              <p className="section-kicker">My events</p>
              <h2 id="my-events">Your events</h2>
            </div>
          </div>

          {myEvents.length > 0 ? (
            <div className="class-event-grid">
              {myEvents.map((event) => (
                <EventClassCard event={event} joined key={event.id} />
              ))}
            </div>
          ) : (
            <div className="studio-empty-state">
              <FolderArtwork color="lavender" label="Room for more"/>
              <h3>Your first pass starts with an event.</h3>
              <p>Register for an event and your digital pass will be saved here automatically.</p>
              <Link href="/events" className="button button-dark">
                Explore events
              </Link>
            </div>
          )}
        </section>
        {publishedEvents.some((event) => !registeredIds.has(event.id)) && <section className="studio-section" aria-labelledby="discover-events"><div className="studio-section-heading"><div><p className="section-kicker">A LITTLE DISCOVERY</p><h2 id="discover-events">For your next event.</h2></div><Link href="/events" className="studio-text-link">Explore <ArrowUpRight size={14}/></Link></div><div className="class-event-grid">{publishedEvents.filter(event => !registeredIds.has(event.id)).slice(0, 3).map(event => <EventClassCard event={event} key={event.id}/>)}</div></section>}
      </main>
    </div>
  );
}
