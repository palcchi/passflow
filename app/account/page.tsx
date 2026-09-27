import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { EventClassCard } from "@/components/event-class-card";
import { FolderArtwork, Sticker } from "@/components/flow-brand-art";

export const metadata = { title: "Dashboard | PassFlow" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, supabase } = await requireUser();
  const username =
    typeof user.user_metadata.username === "string"
      ? user.user_metadata.username.trim()
      : "";
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const name = fullName || username || user.email?.split("@")[0] || "Pengunjung";

  const [
    { memberships, unavailable },
    registrationsResult,
    publishedEvents,
  ] = await Promise.all([
    getMemberships(),
    supabase.from("attendees").select("event_id").eq("user_id", user.id),
    getPublishedEvents().catch(() => []),
  ]);

  const organizer = memberships.some((membership) =>
    canManage(membership.role),
  );
  const registeredIds = new Set(
    (registrationsResult.data ?? []).map((item) => item.event_id),
  );
  const myEvents = publishedEvents.filter((event) =>
    registeredIds.has(event.id),
  );

  return (
    <div className="app-surface flow-workspace studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero workspace-welcome">
          <div className="workspace-welcome-copy">
            <span className="section-kicker">YOUR LITTLE CORNER OF PASSFLOW</span>
            <KineticText text={`Halo, ${name}.`} className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle" delay={0.05}>
              Ada momen baru menunggu. Semua event dan pass kamu ada di sini.
            </TextAnimate>
          <Link href="/events" className="magic-shiny-button">
            <span>
            <Plus size={17} />
            Jelajahi event
            </span>
          </Link>
          </div>
          <div className="workspace-art"><span className="workspace-art-label">↗ {myEvents.length} event tersimpan</span><FolderArtwork color="blue" label="Your next moment"/><Sticker kind="smile"/></div>
        </header>

        {unavailable && (
          <p role="alert" className="studio-status is-error">
            Hak akses akun belum dapat dimuat.
          </p>
        )}

        <section className="studio-section" aria-labelledby="my-events">
          <div className="studio-section-heading">
            <div>
              <p className="section-kicker">My events</p>
              <h2 id="my-events">Event kamu</h2>
            </div>
            <Link href="/events" className="studio-text-link">
              Lihat semua <ArrowUpRight size={14} />
            </Link>
          </div>

          {myEvents.length > 0 ? (
            <div className="class-event-grid">
              {myEvents.map((event) => (
                <EventClassCard flow event={event} joined key={event.id} />
              ))}
            </div>
          ) : (
            <div className="studio-empty-state">
              <FolderArtwork color="lavender" label="Room for more"/>
              <h3>Pass pertama kamu menunggu.</h3>
              <p>Daftar ke event yang kamu suka. Pass digitalnya akan tersimpan di sini.</p>
              <Link href="/events" className="button button-dark">
                Jelajahi event
              </Link>
            </div>
          )}
        </section>
        {publishedEvents.some((event) => !registeredIds.has(event.id)) && <section className="studio-section" aria-labelledby="discover-events"><div className="studio-section-heading"><div><p className="section-kicker">A LITTLE DISCOVERY</p><h2 id="discover-events">Untuk momen berikutnya.</h2></div><Link href="/events" className="studio-text-link">Jelajahi <ArrowUpRight size={14}/></Link></div><div className="class-event-grid">{publishedEvents.filter(event => !registeredIds.has(event.id)).slice(0, 3).map(event => <EventClassCard flow event={event} key={event.id}/>)}</div></section>}
      </main>
    </div>
  );
}
