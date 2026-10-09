import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlowMark, FlowPass } from "@/components/flow-art";

// `kicker` is kept for callers but no longer rendered: the heading carries the page on its own.
export function AuthShell({ title, description, children, backHref = "/", backLabel = "Back" }: {
  title: string; description: string; children: ReactNode;
  backHref?: string; backLabel?: string; kicker?: string;
}) {
  return <div className="ui-app ui-auth">
    <header className="ui-auth-nav">
      <Link href="/" className="ui-brand" aria-label="PassFlow home"><FlowMark /><span>PassFlow</span></Link>
    </header>
    <main id="main" className="ui-auth-main">
      <section className="ui-auth-panel ui-rise">
        <Link href={backHref} className="ui-back"><ArrowLeft size={14} />{backLabel}</Link>
        <div className="ui-auth-heading"><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
      <aside className="ui-auth-art" aria-hidden="true"><FlowPass compact /></aside>
    </main>
    <footer className="ui-auth-footer"><span>© PassFlow</span><nav aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></footer>
  </div>;
}
