import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Text3DFlip } from "@/components/magicui/text-3d-flip";
import { SmoothCursor } from "@/components/magicui/smooth-cursor";

const capabilities = [
  ["01", "Register", "Satu identitas attendee untuk seluruh event flow."],
  ["02", "Assign", "QR otomatis atau claim wristband, dipilih per event."],
  ["03", "Scan", "Validasi akses, checkpoint, dan benefit dari kamera."],
  ["04", "Design", "Pass dan ID card tetap sinkron dengan data attendee."],
];

export default function HomePage() {
  return (
    <main className="landing-shell studio-backdrop">
      <SmoothCursor />

      <nav className="topbar studio-nav">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">P</span>
          <span>PassFlow</span>
        </Link>

        <div className="topbar-actions">
          <ThemeToggle />
          <Link href="/login" className="text-link">
            Masuk
          </Link>
          <ShinyButton href="/register" className="landing-nav-cta">
            Mulai
          </ShinyButton>
        </div>
      </nav>

      <section className="studio-hero">
        <div className="studio-hero-copy">
          <span className="studio-eyebrow">
            <TypingAnimation duration={28}>Event access, without the friction.</TypingAnimation>
          </span>

          <KineticText
            text="One pass. Every event moment."
            className="studio-hero-title"
          />

          <TextAnimate className="studio-hero-description" by="word" delay={0.08}>
            Registrasi, credential, ID card, wristband, scanner, dan event experience bergerak dari satu sumber data yang sama.
          </TextAnimate>

          <div className="studio-hero-actions">
            <ShinyButton href="/register">
              Buat workspace <ArrowUpRight size={15} />
            </ShinyButton>
            <Link href="/e/adorne-nails-exhibition" className="button button-ghost">
              Lihat event demo
            </Link>
          </div>
        </div>

        <div className="studio-flow-panel">
          <div className="studio-flow-head">
            <span>Live flow</span>
            <small>PassFlow system</small>
          </div>
          {capabilities.map(([number, title, copy]) => (
            <div className="studio-flow-item" key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <small>{copy}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="studio-velocity-band" aria-hidden="true">
        <VelocityScroll defaultVelocity={0.45}>
          REGISTER · ASSIGN · CLAIM · SCAN · VALIDATE · DESIGN ·
        </VelocityScroll>
      </div>

      <section className="studio-capabilities">
        <div className="studio-section-copy">
          <span className="section-kicker">Designed around flow</span>
          <Text3DFlip className="studio-flip-heading">
            Less dashboard. More control.
          </Text3DFlip>
          <p>
            Informasi penting tetap dekat. Halaman tidak perlu diisi kartu hanya karena manusia
            menemukan border-radius.
          </p>
        </div>

        <div className="studio-capability-list">
          {capabilities.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer studio-footer">
        <span>PassFlow</span>
        <span>Event identity → credential → access.</span>
      </footer>
    </main>
  );
}
