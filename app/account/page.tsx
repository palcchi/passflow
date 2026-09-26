import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";

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
    <div className="app-surface studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero dashboard-studio-hero">
          <div>
            <span className="section-kicker">Personal workspace</span>
            <KineticText text={`Halo, ${name}.`} className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle" delay={0.05}>
              Pass, event, dan akses yang terhubung ke akunmu berada di satu tempat.
            </TextAnimate>
          </div>

          <Link href="/events" className="studio-icon-action" aria-label="Tambah event">
            <Plus size={17} />
            <span>Tambah event</span>
          </Link>
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
            <div className="studio-event-list">
              {myEvents.map((event) => (
                <Link
                  href={`/e/${event.slug}`}
                  className="studio-event-row"
                  key={event.id}
                  style={{ "--row-accent": event.theme.primary } as React.CSSProperties}
                >
                  <span className="studio-event-accent" />
                  <div className="studio-event-main">
                    <span>{event.dateLabel}</span>
                    <h3>{event.name}</h3>
                    <p>{event.venue || "Venue belum diumumkan"}</p>
                  </div>
                  <div className="studio-event-open">
                    <span>Open pass</span>
                    <ArrowUpRight size={15} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="studio-empty-state">
              <span className="section-kicker">No event yet</span>
              <h3>Belum ada event yang terhubung.</h3>
              <p>Pilih event yang tersedia lalu registrasi dengan akun ini.</p>
              <Link href="/events" className="button button-dark">
                Jelajahi event
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
