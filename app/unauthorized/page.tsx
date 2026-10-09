import Link from "next/link";
import { Sticker } from "@/components/brand-art";

export const metadata = { title: "No access" };

export default function UnauthorizedPage() {
  return <main className="ui-app ui-utility">
    <section className="ui-utility-card ui-rise">
      <Sticker kind="arrow" />
      <h1 className="ui-h1">You do not have access here</h1>
      <p className="ui-lead">Crew need an invitation from the event organizer. To host your own events, start an organizer workspace.</p>
      <div className="ui-row"><Link className="ui-btn ui-btn-primary" href="/account">Back to home</Link><Link className="ui-btn ui-btn-secondary" href="/organizer/start">Start organizing</Link></div>
    </section>
  </main>;
}
