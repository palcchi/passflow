import Link from "next/link";
import { Sticker } from "@/components/brand-art";

export default function NotFound() {
  return <main className="ui-app ui-utility">
    <section className="ui-utility-card ui-rise">
      <Sticker kind="spark" />
      <h1 className="ui-h1">Page not found</h1>
      <p className="ui-lead">This page or event is not available. It may have been moved, made private or unpublished.</p>
      <div className="ui-row"><Link href="/" className="ui-btn ui-btn-primary">Go home</Link><Link href="/events" className="ui-btn ui-btn-secondary">Discover events</Link></div>
    </section>
  </main>;
}
