import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlowMark, FlowPass } from "@/components/flow-art";

export function AuthShell({ title, description, children, backHref = "/", backLabel = "Back", kicker = "YOUR NEXT MOMENT STARTS HERE" }: {
  title: string; description: string; children: ReactNode;
  backHref?: string; backLabel?: string; kicker?: string;
}) {
  return <main className="auth-shell">
    <header className="auth-nav">
      <Link href="/" className="brand-lockup"><FlowMark/>PassFlow</Link>
      <ThemeToggle/>
    </header>
    <div className="auth-layout">
      <section className="auth-form-panel">
        <Link href={backHref} className="auth-back"><ArrowLeft size={15}/>{backLabel}</Link>
        <div className="auth-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
      <aside className="auth-story"><FlowPass compact/><div className="auth-story-footer"><span>Great events<br/>start here.</span><span>↗</span></div></aside>
    </div>
    <footer className="auth-footer"><span>© PassFlow</span><span>Make it a moment.</span></footer>
  </main>;
}
