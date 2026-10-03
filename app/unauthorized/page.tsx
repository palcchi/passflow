import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sticker } from "@/components/brand-art";
export default function UnauthorizedPage() {
  return <main className="utility-shell">
    <section className="utility-card">
      <Sticker kind="arrow"/>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Restricted access</p>
      <h1 className="mt-3 text-3xl tracking-tight">You do not have access to this page.</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Every account starts with attendee access. Crew members need an invitation from the event organizer; to host your own events, apply for an organizer workspace.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild><Link href="/account">Back to dashboard</Link></Button><Button asChild variant="outline"><Link href="/organizer/start">Become an organizer</Link></Button></div>
    </section>
  </main>;
}
