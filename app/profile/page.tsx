import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { AppShell } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile-editor";

export const metadata = { title: "Profile" };
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
      text: "Username must be 3 to 24 characters and contain only letters, numbers, or underscores.",
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
    <AppShell name={fullName} email={user.email} avatarUrl={avatarUrl} organizer={organizer}>
      <header className="ui-pagehead">
        <div>
          <h1 className="ui-h1">Profile</h1>
          <p className="ui-lead">How you appear on passes and to event organizers.</p>
        </div>
      </header>
      {profileStatus && (
        <p role={profileStatus.tone === "error" ? "alert" : "status"} className={profileStatus.tone === "error" ? "ui-notice ui-notice-danger ui-mb" : profileStatus.tone === "success" ? "ui-notice ui-notice-success ui-mb" : "ui-notice ui-mb"}>{profileStatus.text}</p>
      )}
      <ProfileEditor fullName={fullName} username={username} email={user.email ?? ""} avatarUrl={avatarUrl} organizer={organizer} />
    </AppShell>
  );
}
