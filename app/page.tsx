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
      <div className="editorial-hero-actions"><ShinyButton href={session ? "/account" : "/register"}>{session ? "Open dashboard" : "Create free account"}<ArrowUpRight size={16}/></ShinyButton><a href="#events" className="button button-ghost">Browse events</a></div>
      <div className="hero-corner-note"><span>↗</span>No paper tickets.<br/>No long queues.</div>
    </section>
    <div className="editorial-marquee" aria-hidden="true"><VelocityScroll defaultVelocity={0.35}>REGISTER · GET YOUR PASS · SCAN IN · ENJOY THE EVENT · </VelocityScroll></div>
    <section className="landing-proof" aria-label="PassFlow benefits">
      <div><strong>One account</strong><span>for every event</span></div>
      <div><strong>Instant QR</strong><span>digital passes</span></div>
      <div><strong>Figma-ready</strong><span>event experiences</span></div>
      <div><strong>Live check-in</strong><span>for your crew</span></div>
    </section>
    <section className="editorial-section" id="events" aria-labelledby="recent-events">
      <div className="editorial-section-heading"><div><span className="section-kicker">NEWLY PUBLISHED</span><h2 id="recent-events">Upcoming events.<br/><span>Find your next one.</span></h2></div><Link className="studio-text-link" href="/events">All events<ArrowUpRight size={15}/></Link></div>
      {recent.events.length ? <div className="class-event-grid">{recent.events.map(event => <EventClassCard event={event} key={event.id}/>)}</div> : <div className="landing-empty"><FolderArtwork color="blue" label="Coming together"/><div><h3>{recent.unavailable ? "The event collection is temporarily unavailable." : "No events are published yet."}</h3><p>{recent.unavailable ? "Please check the event collection again shortly." : "Published events appear here automatically. Check back soon."}</p></div></div>}
    </section>
    <section className="editorial-section landing-how" aria-labelledby="how-title">
      <div className="editorial-section-heading"><div><span className="section-kicker">HOW IT WORKS</span><h2 id="how-title">From discovery<br/><span>to entry in three steps.</span></h2></div></div>
      <ol className="landing-steps">
        <li><span>01</span><div><h3>Discover an event</h3><p>Browse published events and find the one worth making room for.</p></div></li>
        <li><span>02</span><div><h3>Register once</h3><p>Use one PassFlow account to save your details and get your ticket instantly.</p></div></li>
        <li><span>03</span><div><h3>Show your pass</h3><p>Open your personal QR pass at the door. No printing, no queue anxiety.</p></div></li>
      </ol>
    </section>
    <section className="editorial-section landing-figma" aria-labelledby="figma-title">
      <div><span className="section-kicker">DESIGNED IN FIGMA</span><h2 id="figma-title">Your event should<br/><span>look like your event.</span></h2><p>Bring your approved Figma design into PassFlow. You keep control of the visual system; we handle registration, tickets, QR passes, SEO, and publishing.</p><Link className="button button-dark" href="/organizer">See how Figma fits in<ArrowUpRight size={15}/></Link></div>
      <div className="figma-mini-preview" aria-hidden="true"><span className="figma-mini-top"/><span className="figma-mini-title">A pass<br/>people keep.</span><span className="figma-mini-ticket"><b>PASSFLOW</b><strong>ADMIT ONE</strong><small>SCAN TO ENTER</small></span></div>
    </section>
    <section className="editorial-section organizer-invitation" id="organizer" aria-labelledby="organizer-title">
      <div><span className="section-kicker">PASSFLOW FOR ORGANIZERS</span><h2 id="organizer-title">Hosting an event?<br/><span>Run it on PassFlow.</span></h2><p>Registration, ticket types, crew access, and live check-in in one organizer workspace.</p><ShinyButton href="/organizer">Explore organizer tools<ArrowUpRight size={15}/></ShinyButton></div>
      <div className="invitation-list">
        <div><Sticker kind="arrow"/><div><h3>Designed in Figma.</h3><p>Your event site, ticket page and passes, exactly as designed. PassFlow runs sign-up, tickets and QR.</p></div></div>
        <div><Sticker kind="smile"/><div><h3>Attendees & crew.</h3><p>Manage registrations, import guest lists, and invite crew with role-based access.</p></div></div>
        <div><Sticker kind="check"/><div><h3>QR check-in at the door.</h3><p>Every attendee gets a personal QR pass; your crew scans it with any phone camera.</p></div></div>
      </div>
    </section>
    <footer className="editorial-footer"><Link href="/" className="brand-lockup">PassFlow<span className="brand-dot"/></Link><nav className="editorial-footer-links" aria-label="Footer"><Link href="/events">Discover</Link><Link href="/organizer">For organizers</Link><Link href={session ? "/account" : "/login"}>{session ? "Dashboard" : "Sign in"}</Link></nav><span>© PassFlow · Event registration, QR tickets & check-in</span></footer>
  </main>;
}
