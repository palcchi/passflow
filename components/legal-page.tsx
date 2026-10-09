import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="ui-app legal-shell">
      <header className="legal-nav">
        <Link href="/" className="brand-lockup">PassFlow<span className="brand-dot" /></Link>
        <nav aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </header>
      <main className="legal-body">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
      </main>
    </div>
  );
}
