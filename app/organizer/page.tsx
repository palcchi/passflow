import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FlowMark } from "@/components/flow-art";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { Sticker } from "@/components/brand-art";
import { HeroCardFan } from "@/components/hero-card-fan";
import { getAuthContext, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: { absolute: "PassFlow for Organizers — Event registration, QR tickets & check-in" },
  description: "Run registration, QR tickets, digital passes, crew access, and live check-in from one organizer workspace. Create a free organizer workspace in a minute.",
  alternates: { canonical: "/organizer" },
  openGraph: { title: "PassFlow for Organizers", description: "Registration, QR tickets, crew access, and live check-in in one workspace.", url: "/organizer" },
};

export const dynamic = "force-dynamic";

const features = [
  { kind: "arrow" as const, title: "Branded event pages", body: "Publish an event website with your colors and Figma design, on your own PassFlow subdomain." },
  { kind: "smile" as const, title: "Registration & ticket types", body: "Collect attendees, set ticket categories and capacity, and import guest lists from CSV." },
  { kind: "check" as const, title: "QR passes & live check-in", body: "Every attendee gets a personal QR pass. Your crew scans it at the door with any phone camera." },
];

const steps = ["Create a PassFlow account", "Name your organization", "Start your first event right away"];

export default async function OrganizerLandingPage() {
  const session = await getAuthContext();
  const organizer = session ? (await getMemberships()).memberships.some((m) => canManage(m.role)) : false;
  const cta = organizer ? "/organizer/events" : session ? "/organizer/start" : "/register?next=" + encodeURIComponent("/organizer/start");
  const ctaLabel = organizer ? "Open organizer workspace" : "Become an organizer";

  return <main className="editorial-landing">
    <nav className="editorial-nav" aria-label="Main navigation">
      <Link href="/" className="brand-lockup"><FlowMark/>PassFlow</Link>
      <div className="editorial-nav-links"><Link href="/#events">Discover</Link><a href="#how-it-works">How it works</a></div>
      <div className="editorial-nav-actions"><ThemeToggle compact/>{!session && <Link href={"/login?next=" + encodeURIComponent("/organizer/start")}>Sign in</Link>}<Link href={cta} className="button button-dark">{organizer ? "Workspace" : "Get started"}<ArrowUpRight size={15}/></Link></div>
    </nav>
    <section className="editorial-canvas">
      <span className="editorial-eyebrow"><span/> PASSFLOW FOR ORGANIZERS</span>
      <h1>Run the event.<span>Not the <em>spreadsheet.</em></span></h1>
      <HeroCardFan events={[]}/>
      <p className="editorial-hero-description">Registration, QR tickets, crew access, and live check-in in one workspace, from the first invitation to the last scan at the door.</p>
      <div className="editorial-hero-actions"><ShinyButton href={cta}>{ctaLabel}<ArrowUpRight size={16}/></ShinyButton><a href="#how-it-works">How it works ↓</a></div>
    </section>
    <section className="editorial-section organizer-invitation" aria-labelledby="features-title">
      <div><span className="section-kicker">EVERYTHING IN ONE PLACE</span><h2 id="features-title">One workspace.<br/><span>Every event you run.</span></h2><p>Attendees keep one PassFlow account for every event they join, so your guests sign in once and their pass is always ready.</p></div>
      <div className="invitation-list">
        {features.map((f) => <div key={f.title}><Sticker kind={f.kind}/><div><h3>{f.title}</h3><p>{f.body}</p></div></div>)}
      </div>
    </section>
    <section className="editorial-section" id="how-it-works" aria-labelledby="steps-title">
      <div className="editorial-section-heading"><div><span className="section-kicker">HOW IT WORKS</span><h2 id="steps-title">Three steps to your<br/><span>first published event.</span></h2></div></div>
      <ol className="organizer-steps organizer-steps-large">
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className="organizer-note">Each account runs one event at a time. PassFlow can close workspaces that misuse attendee data or check-in tools.</p>
    </section>
    <footer className="editorial-footer"><Link href="/" className="brand-lockup">PassFlow<span className="brand-dot"/></Link><span>Event registration, QR tickets & check-in. © PassFlow</span><Link href={cta}>{ctaLabel} ↗</Link></footer>
  </main>;
}
