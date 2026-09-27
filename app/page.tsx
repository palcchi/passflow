import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FlowMark } from "@/components/flow-art";
import { ThemeToggle } from "@/components/theme-toggle";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { CollectionArtwork, FolderArtwork, Sticker } from "@/components/brand-art";
import { EventClassCard } from "@/components/event-class-card";
import { getAuthContext } from "@/lib/auth/session";
import { getRecentPublishedEvents } from "@/lib/events";

export default async function HomePage() {
  const [session, recent] = await Promise.all([
    getAuthContext(),
    getRecentPublishedEvents().then(events => ({ events, unavailable: false })).catch(() => ({ events: [], unavailable: true })),
  ]);
  return <main className="editorial-landing">
    <nav className="editorial-nav" aria-label="Main navigation">
      <Link href="/" className="brand-lockup"><FlowMark/>PassFlow</Link>
      <div className="editorial-nav-links"><a href="#events">Discover</a><a href="#organizer">For organizers</a></div>
      <div className="editorial-nav-actions"><ThemeToggle/>{!session && <Link href="/login">Sign in</Link>}<Link href={session ? "/account" : "/register"} className="button button-dark">{session ? "Dashboard" : "Get started"}<ArrowUpRight size={15}/></Link></div>
    </nav>
    <section className="editorial-canvas">
      <span className="editorial-eyebrow"><span/> ONE SPACE. SO MANY POSSIBILITIES.</span>
      <h1>Good people.<span>Great <em>moments.</em></span></h1>
      <p className="editorial-hero-description">Discover events, collect experiences, and keep every pass in one place.</p>
      <div className="editorial-hero-actions"><ShinyButton href={session ? "/account" : "/register"}>{session ? "Open dashboard" : "Discover events"}<ArrowUpRight size={16}/></ShinyButton><a href="#events">Explore events ↓</a></div>
      <CollectionArtwork/>
      <div className="hero-corner-note"><span>↗</span>Less hassle.<br/>More memories.</div>
    </section>
    <div className="editorial-marquee" aria-hidden="true"><VelocityScroll defaultVelocity={0.35}>GOOD PEOPLE · NEW IDEAS · LIVE MOMENTS · YOUR NEXT EVENT · </VelocityScroll></div>
    <section className="editorial-section" id="events" aria-labelledby="recent-events">
      <div className="editorial-section-heading"><div><span className="section-kicker">FRESH FROM THE COMMUNITY</span><h2 id="recent-events">Freshly added.<br/><span>Maybe your next moment.</span></h2></div><Link className="studio-text-link" href="/events">All events<ArrowUpRight size={15}/></Link></div>
      {recent.events.length ? <div className="class-event-grid">{recent.events.map(event => <EventClassCard event={event} key={event.id} flow/>)}</div> : <div className="landing-empty"><FolderArtwork color="blue" label="Coming together"/><div><h3>{recent.unavailable ? "The event collection is temporarily unavailable." : "There is room for something new."}</h3><p>{recent.unavailable ? "Please check the event collection again shortly." : "New events will appear here as they are published."}</p></div></div>}
    </section>
    <section className="editorial-section organizer-invitation" id="organizer" aria-labelledby="organizer-title">
      <div><span className="section-kicker">FOR THE ONES WHO BRING US TOGETHER</span><h2 id="organizer-title">Have a big idea?<br/><span>Give it a place.</span></h2><p>From the first invitation to the final check-in, manage every detail in one place.</p><ShinyButton href={session ? "/account" : "/register"}>{session ? "Open dashboard" : "Create a PassFlow account"}<ArrowUpRight size={15}/></ShinyButton></div>
      <div className="invitation-list">
        <div><Sticker kind="arrow"/><div><h3>Your event, your identity.</h3><p>Customize the event page, colors, and pass design to match your identity.</p></div></div>
        <div><Sticker kind="smile"/><div><h3>A little more together.</h3><p>Manage attendees and invite your crew to run the event together.</p></div></div>
        <div><Sticker kind="check"/><div><h3>One pass. You’re in.</h3><p>Personal QR passes and camera check-in stay connected throughout the event.</p></div></div>
      </div>
    </section>
    <footer className="editorial-footer"><Link href="/" className="brand-lockup">PassFlow<span className="brand-dot"/></Link><span>Make it a moment. © PassFlow</span><Link href={session ? "/profile" : "/login"}>{session ? "Your account" : "Sign in"} ↗</Link></footer>
  </main>;
}
