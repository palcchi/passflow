import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlowMark, FlowPass } from "@/components/flow-art";
import { Sticker } from "@/components/brand-art";

export function AuthShell({ title, description, children, backHref = "/", backLabel = "Back", kicker = "YOUR NEXT MOMENT STARTS HERE" }: {
  title: string; description: string; children: ReactNode;
  backHref?: string; backLabel?: string; kicker?: string;
}) {
  return <main className="auth-shell">
    <header className="auth-nav">
      <Link href="/" className="brand-lockup"><FlowMark/>PassFlow</Link>
      <ThemeToggle compact/>
    </header>
    <div className="auth-layout">
      <section className="auth-form-panel">
        <Link href={backHref} className="auth-back"><ArrowLeft size={15}/>{backLabel}</Link>
        {/* Phones hide the illustration panel; a small sticker row keeps the brand character. */}
        <div className="auth-mobile-art" aria-hidden="true"><Sticker kind="spark"/><Sticker kind="smile"/><Sticker kind="check"/></div>
        <div className="auth-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
      <aside className="auth-story"><FlowPass compact/><div className="auth-story-footer"><span>Great events<br/>start here.</span><span>↗</span></div></aside>
    </div>
    <footer className="auth-footer"><span>© PassFlow</span><span>Make it a moment.</span></footer>
  </main>;
}
