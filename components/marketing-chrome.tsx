import Link from "next/link";
import { FlowMark } from "@/components/flow-art";

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return <>
    <a href="#main" className="ui-skip">Skip to content</a>
    <header className="ui-mk-nav">
      <div className="ui-mk-nav-inner">
        <Link href="/" className="ui-brand" aria-label="PassFlow home"><FlowMark /><span>PassFlow</span></Link>
        <nav className="ui-mk-links" aria-label="Main">
          <Link href="/events">Discover</Link>
          <Link href="/organizer">For organizers</Link>
        </nav>
        <div className="ui-navactions">
          {!signedIn && <Link href="/login" className="ui-btn ui-btn-ghost ui-btn-sm ui-mk-signin">Sign in</Link>}
          <Link href={signedIn ? "/account" : "/register"} className="ui-btn ui-btn-primary ui-btn-sm">{signedIn ? "Open PassFlow" : "Get started"}</Link>
        </div>
      </div>
    </header>
  </>;
}

export function MarketingFooter({ signedIn }: { signedIn: boolean }) {
  return <footer className="ui-mk-footer">
    <div className="ui-mk-footer-inner">
      <Link href="/" className="ui-brand"><FlowMark /><span>PassFlow</span></Link>
      <nav aria-label="Footer">
        <Link href="/events">Discover</Link>
        <Link href="/organizer">For organizers</Link>
        <Link href={signedIn ? "/account" : "/login"}>{signedIn ? "Your account" : "Sign in"}</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <small>© {new Date().getFullYear()} PassFlow</small>
    </div>
  </footer>;
}
