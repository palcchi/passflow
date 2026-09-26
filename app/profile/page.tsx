import Link from "next/link";
import { ExternalLink, Figma, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { figmaConfigured } from "@/lib/figma";
import { UserNavbar } from "@/components/user-navbar";
import { ProfileEditor } from "@/components/profile-editor";
import { BlurFade } from "@/components/magicui/blur-fade";

export const metadata = { title: "Profil | PassFlow" };
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
      : username || "Pengunjung";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const organizer = memberships.some((item) => canManage(item.role));
  const status = typeof query.status === "string" ? query.status : "";
  const figma = typeof query.figma === "string" ? query.figma : "";

  const statusMessages: Record<string, { tone: "success" | "error" | "neutral"; text: string }> = {
    saved: { tone: "success", text: "Profil berhasil diperbarui." },
    "avatar-saved": { tone: "success", text: "Foto profil berhasil diperbarui." },
    "avatar-removed": { tone: "neutral", text: "Foto profil dihapus." },
    "invalid-username": {
      tone: "error",
      text: "Username harus 3–24 karakter dan hanya berisi huruf, angka, atau garis bawah.",
    },
    "invalid-name": { tone: "error", text: "Nama tampilan harus 2–60 karakter." },
    "avatar-missing": { tone: "error", text: "Pilih foto sebelum menyimpan." },
    "avatar-format": { tone: "error", text: "Foto harus berformat JPG, PNG, atau WEBP." },
    "avatar-size": { tone: "error", text: "Ukuran foto maksimal 2 MB." },
    "avatar-error": { tone: "error", text: "Foto profil belum berhasil disimpan." },
    error: { tone: "error", text: "Profil belum berhasil disimpan." },
  };

  const figmaErrors: Record<string, string> = {
    "not-configured": "Konfigurasi Figma di server belum lengkap.",
    "invalid-state": "Sesi koneksi Figma berubah. Coba hubungkan ulang.",
    "missing-code": "Figma belum mengirim kode akses.",
    cancelled: "Permintaan akses Figma dibatalkan.",
    "token-error": "Kode akses Figma ditolak atau kedaluwarsa.",
    "profile-error": "PassFlow belum bisa membaca akun Figma.",
    "database-error": "Koneksi diterima, tetapi belum tersimpan.",
    error: "Koneksi Figma belum berhasil.",
  };

  const profileStatus = statusMessages[status];

  return (
    <div className="app-surface min-h-screen text-neutral-950">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-three" />
      <UserNavbar
        name={fullName}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <BlurFade>
          <header className="profile-page-heading">
            <span className="dashboard-welcome-kicker">
              <Sparkles size={13} /> Account settings
            </span>
            <h1>Profil kamu.</h1>
            <p>Atur identitas, foto profil, dan koneksi desain dari satu tempat.</p>
          </header>
        </BlurFade>

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
            Akun Figma berhasil dihubungkan.
          </div>
        )}
        {figma === "disconnected" && (
          <div role="status" className="profile-status-message is-neutral">
            Koneksi Figma diputus.
          </div>
        )}
        {figma && figmaErrors[figma] && (
          <div role="alert" className="profile-status-message is-error">
            {figmaErrors[figma]}
          </div>
        )}

        <BlurFade delay={0.04}>
          <ProfileEditor
            fullName={fullName}
            username={username}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            organizer={organizer}
          />
        </BlurFade>

        <BlurFade delay={0.08}>
          <section className="profile-integration-card liquid-panel">
            <div className="profile-integration-main">
              <span className="profile-integration-icon">
                <Figma size={20} />
              </span>
              <div>
                <span className="section-kicker">Integration</span>
                <h2>Figma account</h2>
                <p>
                  {connection
                    ? connection.handle ?? connection.email ?? "Akun terhubung"
                    : "Belum terhubung"}
                </p>
              </div>
            </div>

            <div className="profile-integration-body">
              <p>
                PassFlow membaca identitas akun, metadata, preview, dan struktur file yang kamu
                izinkan. File desain tetap milik akun Figma organizer.
              </p>
              <div className="profile-integration-security">
                <ShieldCheck size={15} />
                Token Figma disimpan terenkripsi di server.
              </div>
              {connectionError && (
                <p role="alert" className="text-sm text-red-700">
                  Status Figma belum dapat dimuat. Coba muat ulang halaman.
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
                    Hubungkan ulang
                  </a>
                  <form action="/api/figma/disconnect" method="post">
                    <button type="submit" className="button button-ghost text-red-700">
                      Putuskan koneksi
                    </button>
                  </form>
                </>
              ) : (
                <a
                  href="/api/figma/connect"
                  aria-disabled={!figmaConfigured()}
                  className="button button-dark"
                >
                  Hubungkan Figma <ExternalLink size={15} />
                </a>
              )}
              {organizer && (
                <Link href="/admin" className="button button-ghost">
                  Kelola event
                </Link>
              )}
            </div>
          </section>
        </BlurFade>
      </main>
    </div>
  );
}
