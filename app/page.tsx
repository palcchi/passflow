import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { CollectionArtwork, FolderArtwork, Sticker } from "@/components/brand-art";
import { EventClassCard } from "@/components/event-class-card";
import { getAuthContext } from "@/lib/auth/session";
import { getRecentPublishedEvents } from "@/lib/events";

export default async function HomePage() {
  const [session, recent] = await Promise.all([
    getAuthContext(),
    getRecentPublishedEvents().then(events => ({ events, unavailable: false })).catch(() => ({ events: [], unavailable: true })),
  ]);
  return <main className="editorial-landing">
    <nav className="editorial-nav" aria-label="Navigasi utama">
      <Link href="/" className="brand-lockup"><span className="brand-mark">P</span>PassFlow<span className="brand-dot"/></Link>
      <div className="editorial-nav-links"><a href="#events">Discover</a><a href="#organizer">For organizers</a></div>
      <div className="editorial-nav-actions"><ThemeToggle/>{!session && <Link href="/login">Masuk</Link>}<Link href={session ? "/account" : "/register"} className="button button-dark">{session ? "Dashboard" : "Mulai di sini"}<ArrowUpRight size={15}/></Link></div>
    </nav>
    <section className="editorial-canvas">
      <span className="editorial-eyebrow"><span/> ONE SPACE. SO MANY POSSIBILITIES.</span>
      <h1>Good people.<span>Great <em>moments.</em></span></h1>
      <p className="editorial-hero-description">Temukan event, kumpulkan pengalaman, dan simpan setiap pass. Satu tempat untuk momen berikutnya.</p>
      <div className="editorial-hero-actions"><ShinyButton href={session ? "/account" : "/register"}>{session ? "Buka dashboard" : "Temukan momenmu"}<ArrowUpRight size={16}/></ShinyButton><a href="#events">Lihat event ↓</a></div>
      <CollectionArtwork/>
      <div className="hero-corner-note"><span>↗</span>Less hassle.<br/>More memories.</div>
    </section>
    <div className="editorial-marquee" aria-hidden="true"><VelocityScroll defaultVelocity={0.35}>GOOD PEOPLE · NEW IDEAS · LIVE MOMENTS · YOUR NEXT EVENT · </VelocityScroll></div>
    <section className="editorial-section" id="events" aria-labelledby="recent-events">
      <div className="editorial-section-heading"><div><span className="section-kicker">FRESH FROM THE COMMUNITY</span><h2 id="recent-events">Baru ditambahkan.<br/><span>Mungkin, momen kamu.</span></h2></div><Link className="studio-text-link" href="/events">Semua event<ArrowUpRight size={15}/></Link></div>
      {recent.events.length ? <div className="class-event-grid">{recent.events.map(event => <EventClassCard event={event} key={event.id}/>)}</div> : <div className="landing-empty"><FolderArtwork color="blue" label="Coming together"/><div><h3>{recent.unavailable ? "Koleksi sedang tidak tersedia." : "Ada ruang untuk cerita baru."}</h3><p>{recent.unavailable ? "Coba buka koleksi event kembali sebentar lagi." : "Event terbaru akan hadir di sini. Buat akun dan siapkan momen pertamamu."}</p></div></div>}
    </section>
    <section className="editorial-section organizer-invitation" id="organizer" aria-labelledby="organizer-title">
      <div><span className="section-kicker">FOR THE ONES WHO BRING US TOGETHER</span><h2 id="organizer-title">Punya ide besar?<br/><span>Kasih ruang.</span></h2><p>Dari undangan pertama sampai check-in terakhir, kelola event dengan caramu sendiri.</p><ShinyButton href={session ? "/account" : "/register"}>{session ? "Buka dashboard" : "Buat akun PassFlow"}<ArrowUpRight size={15}/></ShinyButton></div>
      <div className="invitation-list">
        <div><Sticker kind="arrow"/><div><h3>Your event, your identity.</h3><p>Atur halaman, warna, dan desain pass sesuai karaktermu.</p></div></div>
        <div><Sticker kind="smile"/><div><h3>A little more together.</h3><p>Kelola peserta dan ajak crew untuk bantu jalannya event.</p></div></div>
        <div><Sticker kind="check"/><div><h3>One pass. You’re in.</h3><p>QR personal dan check-in kamera, semuanya terhubung.</p></div></div>
      </div>
    </section>
    <footer className="editorial-footer"><Link href="/" className="brand-lockup">PassFlow<span className="brand-dot"/></Link><span>Make it a moment. © PassFlow</span><Link href={session ? "/profile" : "/login"}>{session ? "Akun kamu" : "Masuk"} ↗</Link></footer>
  </main>;
}
