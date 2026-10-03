import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FlowMark } from "@/components/flow-art";
import { ThemeToggle } from "@/components/theme-toggle";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { FolderArtwork, Sticker } from "@/components/brand-art";
import { HeroCardFan } from "@/components/hero-card-fan";
import { EventClassCard } from "@/components/event-class-card";
import { getAuthContext } from "@/lib/auth/session";
import { getRecentPublishedEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: { absolute: "PassFlow — Event registration, QR tickets & digital passes" },
  description: "Discover events, register in seconds, and keep every QR ticket and digital pass in one PassFlow account. Organizers run registration and live check-in from one workspace.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [session, recent] = await Promise.all([
    getAuthContext(),
    getRecentPublishedEvents().then(events => ({ events, unavailable: false })).catch(() => ({ events: [], unavailable: true })),
  ]);
  return <main className="editorial-landing">
    <nav className="editorial-nav" aria-label="Main navigation">
      <Link href="/" className="brand-lockup"><FlowMark/>PassFlow</Link>
      <div className="editorial-nav-links"><a href="#events">Discover</a><Link href="/organizer">For organizers</Link></div>
      <div className="editorial-nav-actions"><ThemeToggle compact/>{!session && <Link href="/login">Sign in</Link>}<Link href={session ? "/account" : "/register"} className="button button-dark">{session ? "Dashboard" : "Get started"}<ArrowUpRight size={15}/></Link></div>
    </nav>
    <section className="editorial-canvas">
      <span className="editorial-eyebrow"><span/> EVENTS, TICKETS & PASSES IN ONE PLACE</span>
      <h1>Every event.<span>One <em>pass.</em></span></h1>
      <HeroCardFan events={recent.events}/>
      <p className="editorial-hero-description">Find events worth showing up for, register in seconds, and walk in with a personal QR pass that is always in your pocket.</p>
      <div className="editorial-hero-actions"><ShinyButton href={session ? "/account" : "/register"}>{session ? "Open dashboard" : "Create free account"}<ArrowUpRight size={16}/></ShinyButton><a href="#events">Browse events ↓</a></div>
      <div className="hero-corner-note"><span>↗</span>No paper tickets.<br/>No long queues.</div>
    </section>
    <div className="editorial-marquee" aria-hidden="true"><VelocityScroll defaultVelocity={0.35}>REGISTER · GET YOUR PASS · SCAN IN · ENJOY THE EVENT · </VelocityScroll></div>
    <section className="editorial-section" id="events" aria-labelledby="recent-events">
      <div className="editorial-section-heading"><div><span className="section-kicker">NEWLY PUBLISHED</span><h2 id="recent-events">Upcoming events.<br/><span>Find your next one.</span></h2></div><Link className="studio-text-link" href="/events">All events<ArrowUpRight size={15}/></Link></div>
      {recent.events.length ? <div className="class-event-grid">{recent.events.map(event => <EventClassCard event={event} key={event.id} flow/>)}</div> : <div className="landing-empty"><FolderArtwork color="blue" label="Coming together"/><div><h3>{recent.unavailable ? "The event collection is temporarily unavailable." : "No events are published yet."}</h3><p>{recent.unavailable ? "Please check the event collection again shortly." : "Published events appear here automatically. Check back soon."}</p></div></div>}
    </section>
    <section className="editorial-section organizer-invitation" id="organizer" aria-labelledby="organizer-title">
      <div><span className="section-kicker">PASSFLOW FOR ORGANIZERS</span><h2 id="organizer-title">Hosting an event?<br/><span>Run it on PassFlow.</span></h2><p>Registration, ticket types, crew access, and live check-in in one organizer workspace.</p><ShinyButton href="/organizer">Explore organizer tools<ArrowUpRight size={15}/></ShinyButton></div>
      <div className="invitation-list">
        <div><Sticker kind="arrow"/><div><h3>Branded event pages.</h3><p>Publish an event website and digital pass in your own colors, or bring a design from Figma.</p></div></div>
        <div><Sticker kind="smile"/><div><h3>Attendees & crew.</h3><p>Manage registrations, import guest lists, and invite crew with role-based access.</p></div></div>
        <div><Sticker kind="check"/><div><h3>QR check-in at the door.</h3><p>Every attendee gets a personal QR pass; your crew scans it with any phone camera.</p></div></div>
      </div>
    </section>
    <footer className="editorial-footer"><Link href="/" className="brand-lockup">PassFlow<span className="brand-dot"/></Link><span>Event registration, QR tickets & check-in. © PassFlow</span><Link href={session ? "/profile" : "/login"}>{session ? "Your account" : "Sign in"} ↗</Link></footer>
  </main>;
}
