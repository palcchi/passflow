import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { Sticker } from "@/components/brand-art";
import { HeroCardFan } from "@/components/hero-card-fan";
import { EventClassCard } from "@/components/event-class-card";
import { MarketingNav, MarketingFooter } from "@/components/marketing-chrome";
import { getAuthContext } from "@/lib/auth/session";
import { getRecentPublishedEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: { absolute: "PassFlow: event registration, QR tickets and digital passes" },
  description: "Discover events, register in seconds, and keep every QR ticket and digital pass in one PassFlow account. Organizers run registration and live check-in from one workspace.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [session, recent] = await Promise.all([
    getAuthContext(),
    getRecentPublishedEvents().then((events) => ({ events, unavailable: false })).catch(() => ({ events: [], unavailable: true })),
  ]);
  const start = session ? "/account" : "/register";

  return <div className="ui-app ui-mk">
    <MarketingNav signedIn={Boolean(session)} />
    <main id="main">
      <section className="ui-mk-hero">
        <div className="ui-mk-hero-copy ui-rise">
          <h1>Every event.<br /><span>One pass.</span></h1>
          <p>Find something worth showing up for, register in seconds, and walk in with a QR pass that lives in your pocket.</p>
          <div className="ui-row">
            <Link href={start} className="ui-btn ui-btn-primary ui-btn-lg">{session ? "Open PassFlow" : "Get started"}<ArrowRight size={17} /></Link>
            <Link href="#events" className="ui-btn ui-btn-ghost ui-btn-lg">Browse events</Link>
          </div>
        </div>
        <div className="ui-mk-hero-art"><HeroCardFan events={recent.events} /></div>
      </section>

      <div className="ui-mk-marquee" aria-hidden="true"><VelocityScroll defaultVelocity={0.3}>Register · Get your pass · Scan in · Enjoy the event · </VelocityScroll></div>

      <section className="ui-mk-section" id="events" aria-labelledby="events-title">
        <div className="ui-sectionhead">
          <h2 id="events-title" className="ui-mk-h2">Happening soon</h2>
          <Link className="ui-link" href="/events">All events <ArrowRight size={15} /></Link>
        </div>
        {recent.events.length ? (
          <div className="ui-eventgrid">{recent.events.map((event) => <EventClassCard event={event} key={event.id} />)}</div>
        ) : (
          <div className="ui-empty"><strong>{recent.unavailable ? "Events are unavailable right now" : "New events are on their way"}</strong><p>{recent.unavailable ? "Please check back in a moment." : "Published events show up here automatically."}</p></div>
        )}
      </section>

      <section className="ui-mk-section ui-mk-how" aria-labelledby="how-title">
        <h2 id="how-title" className="ui-mk-h2">From finding it<br /><span>to walking in.</span></h2>
        <ol className="ui-mk-steps">
          <li><strong>Find</strong><p>Browse events from organizers who run them on PassFlow.</p></li>
          <li><strong>Register</strong><p>One account holds your details, so signing up takes a tap. Some events ask the organizer to approve you first.</p></li>
          <li><strong>Walk in</strong><p>Open your pass at the door. Crew scan it with any phone and you are in.</p></li>
        </ol>
      </section>

      <section className="ui-mk-section ui-mk-bento" aria-labelledby="org-title">
        <div className="ui-mk-bento-main">
          <h2 id="org-title" className="ui-mk-h2">Hosting an event?<br /><span>Run it on PassFlow.</span></h2>
          <p>Registration, approvals, pass categories, crew access and live check-in in one workspace. Your event page and passes come straight from Figma.</p>
          <Link href="/organizer" className="ui-btn ui-btn-primary">For organizers <ArrowRight size={16} /></Link>
        </div>
        <div className="ui-mk-bento-cell ui-mk-tone-a"><Sticker kind="arrow" /><strong>Designed in Figma</strong><span>Your site and passes, exactly as designed.</span></div>
        <div className="ui-mk-bento-cell ui-mk-tone-b"><Sticker kind="smile" /><strong>Approve who joins</strong><span>Private events and guest review built in.</span></div>
        <div className="ui-mk-bento-cell ui-mk-tone-c"><Sticker kind="check" /><strong>Scan at the door</strong><span>Any phone becomes a scanner for your crew.</span></div>
      </section>
    </main>
    <MarketingFooter signedIn={Boolean(session)} />
  </div>;
}
