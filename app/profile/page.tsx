import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { UserNavbar } from "@/components/user-navbar";
import { ProfileEditor } from "@/components/profile-editor";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Sticker } from "@/components/brand-art";

export const metadata = { title: "Profile | PassFlow" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser("/profile");
  const [{ memberships }, query] = await Promise.all([getMemberships(), searchParams]);

  const username =
    typeof user.user_metadata.username === "string"
      ? user.user_metadata.username
      : user.email?.split("@")[0] || "";
  const fullName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : username || "Attendee";
  const { avatarUrl } = accountProfile(user);
  const organizer = memberships.some((item) => canManage(item.role));
  const status = typeof query.status === "string" ? query.status : "";

  const statusMessages: Record<string, { tone: "success" | "error" | "neutral"; text: string }> = {
    saved: { tone: "success", text: "Profile updated successfully." },
    "avatar-saved": { tone: "success", text: "Profile photo updated successfully." },
    "avatar-removed": { tone: "neutral", text: "Profile photo removed." },
    "invalid-username": {
      tone: "error",
      text: "Username must be 3–24 characters and contain only letters, numbers, or underscores.",
    },
    "invalid-name": { tone: "error", text: "Display name must be between 2 and 60 characters." },
    "avatar-missing": { tone: "error", text: "Choose a photo before saving." },
    "avatar-format": { tone: "error", text: "Use a JPG, PNG, or WEBP image." },
    "avatar-size": { tone: "error", text: "The maximum photo size is 2 MB." },
    "avatar-error": { tone: "error", text: "The profile photo could not be saved." },
    error: { tone: "error", text: "The profile could not be saved." },
  };


  const profileStatus = statusMessages[status];

  return (
    <div className="app-surface flow-workspace studio-backdrop min-h-screen">
      <UserNavbar
        name={fullName}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <header className="profile-page-heading studio-page-hero">
          <div>
            <span className="section-kicker">Account settings</span>
            <KineticText text="Your profile." className="studio-page-title" />
            <TextAnimate className="studio-page-subtitle">
              Manage your identity and profile photo in one place.
            </TextAnimate>
          </div>
          <Sticker kind="smile"/>
        </header>

        {profileStatus && (
          <div
            role={profileStatus.tone === "error" ? "alert" : "status"}
            className={`profile-status-message is-${profileStatus.tone}`}
          >
            {profileStatus.text}
          </div>
        )}

        <ProfileEditor
            fullName={fullName}
            username={username}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            organizer={organizer}
          />

      </main>
    </div>
  );
}
