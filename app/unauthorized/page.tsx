import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sticker } from "@/components/brand-art";
export default function UnauthorizedPage() {
  return <main className="utility-shell">
    <section className="utility-card">
      <Sticker kind="arrow"/>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Akses terbatas</p>
      <h1 className="mt-3 text-3xl tracking-tight">You do not have access to this page.</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Contact the organizer to confirm your role and permissions. New accounts start with attendee access.</p>
      <Button asChild className="mt-7"><Link href="/account">Back to account</Link></Button>
    </section>
  </main>;
}
