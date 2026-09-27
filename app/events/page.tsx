import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { EventCollection } from "@/components/event-collection";
import { FolderArtwork, Sticker } from "@/components/flow-brand-art";

export const metadata = { title: "Event | PassFlow" };

export default async function EventsPage() {
  const { user, supabase } = await requireUser("/events");
  const name =
    typeof user.user_metadata.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] || "Attendee";
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
            <span className="section-kicker">Explore</span>
            <KineticText text="Find your people." className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle">
              Find an event that fits you. Register, save your pass, and you are ready to go.
            </TextAnimate>
          </div>
          <div className="workspace-art"><FolderArtwork color="orange" label="Good things ahead"/><Sticker kind="spark"/></div>
        </header>
        <EventCollection events={events} registeredIds={Array.from(registeredIds)}/>
      </main>
    </div>
  );
}
