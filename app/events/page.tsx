import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { EventClassCard } from "@/components/event-class-card";

export const metadata = { title: "Event | PassFlow" };

export default async function EventsPage() {
  const { user, supabase } = await requireUser("/events");
  const name =
    typeof user.user_metadata.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] || "Pengunjung";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;

  const [{ memberships }, registrationsResult, events] = await Promise.all([
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

  return (
    <div className="app-surface studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero">
          <div>
            <span className="section-kicker">Explore</span>
            <KineticText text="Find your next event." className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle">
              Buka event, registrasi, lalu gunakan credential yang terhubung ke akunmu.
            </TextAnimate>
          </div>
        </header>

        <section className="class-event-grid">
          {events.map((event) => {
            const joined = registeredIds.has(event.id);
            return (
              <EventClassCard event={event} joined={joined} key={event.id} />
            );
          })}
        </section>

        {events.length === 0 && (
          <div className="studio-empty-state">
            <h3>Belum ada event yang dipublikasikan.</h3>
            <p>Daftar event akan muncul di sini saat organizer mempublikasikannya.</p>
          </div>
        )}
      </main>
    </div>
  );
}
