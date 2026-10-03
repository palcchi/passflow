import Link from "next/link";
import { accountProfile, requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { figmaConfigured } from "@/lib/figma";
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
  const { supabase, user } = await requireUser("/profile");
  const [{ data: connection, error: connectionError }, { memberships }, query] =
    await Promise.all([
      supabase
        .from("figma_connections")
        .select("handle,email,expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      getMemberships(),
      searchParams,
    ]);

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
  const figma = typeof query.figma === "string" ? query.figma : "";

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

  const figmaErrors: Record<string, string> = {
    "not-configured": "The Figma server configuration is incomplete.",
    "invalid-state": "The Figma connection session changed. Please reconnect.",
    "missing-code": "Figma did not return an access code.",
    cancelled: "Figma access was cancelled.",
    "token-error": "The Figma access code was rejected or has expired.",
    "profile-error": "PassFlow could not read the connected Figma account.",
    "database-error": "The connection was accepted but could not be saved.",
    error: "The Figma connection could not be completed.",
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
              Manage your identity, profile photo, and design connections in one place.
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
        {figma === "connected" && (
          <div role="status" className="profile-status-message is-success">
            Figma account connected successfully.
          </div>
        )}
        {figma === "disconnected" && (
          <div role="status" className="profile-status-message is-neutral">
            Figma account disconnected.
          </div>
        )}
        {figma && figmaErrors[figma] && (
          <div role="alert" className="profile-status-message is-error">
            {figmaErrors[figma]}
          </div>
        )}

        <ProfileEditor
            fullName={fullName}
            username={username}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            organizer={organizer}
          />

        <section className="profile-integration-card">
            <div className="profile-integration-main">
              <div>
                <span className="section-kicker">Integration</span>
                <h2>Figma account</h2>
                <p>
                  {connection
                    ? connection.handle ?? connection.email ?? "Connected account"
                    : "Not connected"}
                </p>
              </div>
            </div>

            <div className="profile-integration-body">
              <p>
                PassFlow reads the account identity, metadata, previews, and file structure you
                authorize. Your design files remain in the connected Figma account.
              </p>
              <div className="profile-integration-security">
                Figma tokens are stored encrypted on the server.
              </div>
              {connectionError && (
                <p role="alert" className="text-sm text-red-700">
                  The Figma connection status could not be loaded. Refresh the page and try again.
                </p>
              )}
            </div>

            <div className="profile-integration-actions">
              {connection ? (
                <>
                  <a
                    href="/api/figma/connect"
                    className="button button-ghost"
                  >
                    Reconnect
                  </a>
                  <form action="/api/figma/disconnect" method="post">
                    <button type="submit" className="button button-ghost text-red-700">
                      Disconnect
                    </button>
                  </form>
                </>
              ) : figmaConfigured() ? (
                <a
                  href="/api/figma/connect"
                  className="button button-dark"
                >
                  Connect Figma
                </a>
              ) : <button type="button" className="button button-dark" disabled title="Figma integration is not available in this environment">Figma unavailable</button>}
              {organizer && (
                <Link href="/admin" className="button button-ghost">
                  Manage events
                </Link>
              )}
            </div>
        </section>
      </main>
    </div>
  );
}
