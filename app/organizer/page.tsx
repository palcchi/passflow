import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Sticker } from "@/components/brand-art";
import { HeroCardFan } from "@/components/hero-card-fan";
import { MarketingNav, MarketingFooter } from "@/components/marketing-chrome";
import { getAuthContext, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: { absolute: "PassFlow for organizers: registration, QR tickets and check-in" },
  description: "Run registration, approvals, QR passes, crew access and live check-in from one organizer workspace. Create a free organizer workspace in a minute.",
  alternates: { canonical: "/organizer" },
  openGraph: { title: "PassFlow for organizers", description: "Registration, QR passes, crew access and live check-in in one workspace.", url: "/organizer" },
};

export const dynamic = "force-dynamic";

const features = [
  { kind: "arrow" as const, tone: "ui-mk-tone-a", title: "Your design, from Figma", body: "Build the event page and passes in Figma with the PassFlow plugin. Press Sync and it is live." },
  { kind: "smile" as const, tone: "ui-mk-tone-b", title: "Public, private or by approval", body: "List the event in Discover, share a private link, or review every registration before a pass is issued." },
  { kind: "check" as const, tone: "ui-mk-tone-c", title: "Check-in on any phone", body: "Crew open a scanner link and scan passes at the door. Zones, activities and one-time benefits included." },
];

export default async function OrganizerLandingPage() {
  const session = await getAuthContext();
  const organizer = session ? (await getMemberships()).memberships.some((m) => canManage(m.role)) : false;
  const cta = organizer ? "/organizer/events" : session ? "/organizer/start" : "/register?next=" + encodeURIComponent("/organizer/start");
  const ctaLabel = organizer ? "Open workspace" : "Start organizing";

  return <div className="ui-app ui-mk">
    <MarketingNav signedIn={Boolean(session)} />
    <main id="main">
      <section className="ui-mk-hero">
        <div className="ui-mk-hero-copy ui-rise">
          <h1 className="ui-mk-h1-long">Run the event.<br /><span>Not the spreadsheet.</span></h1>
          <p>Registration, approvals, QR passes and check-in in one workspace, from the first invite to the last scan.</p>
          <div className="ui-row">
            <Link href={cta} className="ui-btn ui-btn-primary ui-btn-lg">{ctaLabel}<ArrowRight size={17} /></Link>
            <a href="#how" className="ui-btn ui-btn-ghost ui-btn-lg">How it works</a>
          </div>
        </div>
        <div className="ui-mk-hero-art"><HeroCardFan events={[]} /></div>
      </section>

      <section className="ui-mk-section" aria-labelledby="features-title">
        <h2 id="features-title" className="ui-mk-h2 ui-mb-lg">One workspace.<br /><span>Every part of the day.</span></h2>
        <div className="ui-mk-features">
          {features.map((f) => <article key={f.title} className={`ui-mk-feature ${f.tone}`}><Sticker kind={f.kind} /><strong>{f.title}</strong><p>{f.body}</p></article>)}
        </div>
      </section>

      <section className="ui-mk-section ui-mk-how" id="how" aria-labelledby="how-title">
        <h2 id="how-title" className="ui-mk-h2">Live in<br /><span>a few minutes.</span></h2>
        <div>
          <ol className="ui-mk-steps">
            <li><strong>Create your account</strong><p>The same PassFlow account you use for passes.</p></li>
            <li><strong>Name your organization</strong><p>Your workspace opens right away.</p></li>
            <li><strong>Publish your event</strong><p>Add dates and pass categories, choose who can join, and share the link.</p></li>
          </ol>
          <p className="ui-small ui-mt">Each account runs one event at a time. PassFlow can close workspaces that misuse attendee data or check-in tools.</p>
        </div>
      </section>

      <section className="ui-mk-section ui-mk-cta">
        <h2 className="ui-mk-h2">Ready for your next event?</h2>
        <Link href={cta} className="ui-btn ui-btn-primary ui-btn-lg">{ctaLabel}<ArrowRight size={17} /></Link>
      </section>
    </main>
    <MarketingFooter signedIn={Boolean(session)} />
  </div>;
}
