import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Plus, Sparkles } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MagicCard } from "@/components/magicui/magic-card";

export const metadata = { title: "Dashboard | PassFlow" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, supabase } = await requireUser();
  const username =
    typeof user.user_metadata.username === "string" ? user.user_metadata.username.trim() : "";
  const fullName =
    typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const name = fullName || username || user.email?.split("@")[0] || "Pengunjung";

  const [{ memberships, unavailable }, registrationsResult, publishedEvents] = await Promise.all([
    getMemberships(),
    supabase.from("attendees").select("event_id").eq("user_id", user.id),
    getPublishedEvents().catch(() => []),
  ]);

  const organizer = memberships.some((membership) => canManage(membership.role));
  const registeredIds = new Set((registrationsResult.data ?? []).map((item) => item.event_id));
  const myEvents = publishedEvents.filter((event) => registeredIds.has(event.id));

  return (
    <div className="app-surface min-h-screen text-neutral-950">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer={organizer}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <BlurFade>
          <header className="dashboard-welcome liquid-panel">
            <div className="dashboard-welcome-copy">
              <span className="dashboard-welcome-kicker">
                <Sparkles size={13} /> Personal workspace
              </span>
              <h1>Halo, {name}.</h1>
              <p>
                Semua event yang terhubung ke akunmu ada di satu tempat, tanpa dashboard yang
                terasa seperti spreadsheet memakai jas.
              </p>
            </div>
            <Link
              href="/events"
              className="dashboard-add-event"
              aria-label="Tambah event"
              title="Tambah event"
            >
              <Plus size={20} />
              <span>Tambah event</span>
            </Link>
          </header>
        </BlurFade>

        {unavailable && (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur">
            Hak akses akun belum dapat dimuat.
          </p>
        )}

        <section className="mt-10" aria-labelledby="my-events">
          <BlurFade delay={0.04}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">My events</p>
                <h2 id="my-events" className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                  Event kamu
                </h2>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
              >
                Lihat semua <ArrowUpRight size={15} />
              </Link>
            </div>
          </BlurFade>

          {myEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myEvents.map((event, index) => (
                <BlurFade delay={0.07 + index * 0.04} key={event.id}>
                  <MagicCard className="event-glass-card group overflow-hidden rounded-[24px] border border-white/70 shadow-[0_14px_45px_rgba(20,20,18,.07)] backdrop-blur-xl">
                    <Link href={`/e/${event.slug}`} className="block">
                      <div className="event-card-top">
                        <div>
                          <p>PassFlow Event</p>
                          <h3>{event.name}</h3>
                        </div>
                        <span
                          className="event-card-accent"
                          style={{ background: event.theme.primary }}
                        />
                      </div>
                      <div className="event-card-body">
                        <div className="space-y-2.5 text-sm text-neutral-500">
                          <p className="flex items-center gap-2">
                            <CalendarDays size={15} /> {event.dateLabel}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin size={15} /> {event.venue || "Venue belum diumumkan"}
                          </p>
                        </div>
                        <div className="event-card-footer">
                          <span>Buka event</span>
                          <span className="event-card-arrow">
                            <ArrowUpRight size={16} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </MagicCard>
                </BlurFade>
              ))}
            </div>
          ) : (
            <BlurFade delay={0.08}>
              <MagicCard className="empty-glass-state rounded-[26px] border border-white/70 p-7 shadow-[0_16px_50px_rgba(20,20,18,.06)] backdrop-blur-xl sm:p-10">
                <span className="empty-state-icon">
                  <Plus size={20} />
                </span>
                <h3>Belum ada event.</h3>
                <p>
                  Tambahkan event pertama dari daftar event yang tersedia. Ya, untuk sekali ini
                  tombol plus memang melakukan sesuatu.
                </p>
                <Link href="/events" className="button button-dark mt-5">
                  Tambah event <ArrowUpRight size={16} />
                </Link>
              </MagicCard>
            </BlurFade>
          )}
        </section>
      </main>
    </div>
  );
}
