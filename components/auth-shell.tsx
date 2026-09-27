import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CollectionArtwork, Sticker } from "@/components/brand-art";

export function AuthShell({ title, description, children, backHref = "/", backLabel = "Kembali", kicker = "YOUR NEXT MOMENT STARTS HERE" }: {
  title: string; description: string; children: ReactNode;
  backHref?: string; backLabel?: string; kicker?: string;
}) {
  return <main className="auth-shell">
    <header className="auth-nav">
      <Link href="/" className="brand-lockup"><span className="brand-mark">P</span>PassFlow<span className="brand-dot"/></Link>
      <ThemeToggle/>
    </header>
    <div className="auth-layout">
      <aside className="auth-story">
        <span className="editorial-eyebrow"><span/> A LITTLE SPACE FOR BIG MOMENTS</span>
        <h2>Good people.<br/><span>Great moments.</span><Sticker kind="spark"/></h2>
        <p>Event yang kamu suka.<br/>Orang-orang yang ingin kamu temui.<br/>Semuanya mulai di sini.</p>
        <CollectionArtwork compact/>
        <div className="auth-story-footer"><span>Less hassle. More memories.</span><span>↗</span></div>
      </aside>
      <section className="auth-form-panel">
        <Link href={backHref} className="auth-back"><ArrowLeft size={15}/>{backLabel}</Link>
        <div className="auth-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
    </div>
    <footer className="auth-footer"><span>© PassFlow</span><span>Make it a moment.</span></footer>
  </main>;
}
