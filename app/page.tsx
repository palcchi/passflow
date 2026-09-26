import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MagicCard } from "@/components/magicui/magic-card";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  QrCode,
  ScanLine,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Claim-Based QR Pass",
    copy: "Wristband dibuat massal dengan QR unik, lalu diklaim sendiri oleh pengunjung.",
  },
  {
    icon: ScanLine,
    title: "Camera Scanner",
    copy: "Arahkan QR ke kamera, validasi muncul otomatis, lalu scanner kembali siap.",
  },
  {
    icon: Sparkles,
    title: "Custom Event Theme",
    copy: "Setiap event punya warna, identitas, hero, dan halaman publik sendiri.",
  },
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="topbar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">P</span>
          <span>PassFlow</span>
        </Link>
        <div className="topbar-actions">
          <Link href="/e/adorne-nails-exhibition" className="text-link">
            Event demo
          </Link>
          <Link href="/login" className="text-link">
            Masuk
          </Link>
          <Link href="/register" className="button button-dark">
            Buat akun
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <BlurFade className="hero-copy">
          <div className="eyebrow-pill">
            <BadgeCheck size={15} />
            Multi-event access platform
          </div>
          <h1>
            One pass.
            <br />
            Every event moment.
          </h1>
          <p>
            PassFlow menyatukan registrasi, QR wristband, digital pass,
            access control, activity tracking, dan monitoring event dalam satu
            web app.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg"><Link href="/register">
              Buat akun gratis
              <ArrowUpRight size={17} />
            </Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/scan/main-entrance">
              Try scanner
            </Link></Button>
          </div>
        </BlurFade>

        <div className="hero-visual">
          <div className="visual-orbit visual-orbit-one" />
          <div className="visual-orbit visual-orbit-two" />
          <div className="pass-card pass-card-back">
            <span>ADORNE NAILS EXHIBITION</span>
            <strong>VIP</strong>
          </div>
          <div className="pass-card pass-card-front">
            <div className="pass-card-head">
              <span className="mini-label">EVENT PASS</span>
              <span className="status-dot">ACTIVE</span>
            </div>
            <div className="fake-qr" aria-hidden="true">
              {Array.from({ length: 49 }).map((_, index) => (
                <span key={index} className={index % 3 === 0 || index % 7 === 0 ? "filled" : ""} />
              ))}
            </div>
            <div className="pass-owner">
              <span>CLAIMED TO</span>
              <strong>VALLIAN</strong>
              <small>WR-0192 · VIP ACCESS</small>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map(({ icon: Icon, title, copy }) => (
          <MagicCard className="feature-card" key={title}>
            <div className="feature-icon">
              <Icon size={20} />
            </div>
            <h2>{title}</h2>
            <p>{copy}</p>
          </MagicCard>
        ))}
      </section>

      <section className="flow-strip">
        <div className="flow-copy">
          <span className="section-kicker">Designed for real flow</span>
          <h2>Generate. Claim. Scan. Validate.</h2>
        </div>
        <div className="flow-steps">
          {[
            ["01", "Create event"],
            ["02", "Generate QR"],
            ["03", "Visitor claims"],
            ["04", "Scan access"],
          ].map(([number, label]) => (
            <div className="flow-step" key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>PassFlow · PassFlow workspace</span>
        <span className="footer-note">
          <CalendarDays size={14} /> Event access platform
        </span>
      </footer>
    </main>
  );
}
