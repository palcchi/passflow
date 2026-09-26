export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CirclePlus,
  MapPin,
  QrCode,
  ScanLine,
  Sparkles,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import { requireOrganizer } from "@/lib/auth/session";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { UserNavbar } from "@/components/user-navbar";
import { getManagedEvents } from "@/lib/events";

export default async function AdminDashboardPage() {
  const { supabase, user } = await requireOrganizer();
  const events = await getManagedEvents();
  const eventIds = events.map((event) => event.id);
  const [qrResult, stationResult] = eventIds.length
    ? await Promise.all([
        supabase
          .from("qr_credentials")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .eq("status", "active"),
        supabase
          .from("scanner_stations")
          .select("id,name,is_active,event_id")
          .in("event_id", eventIds)
          .order("name"),
      ])
    : [{ count: 0 }, { data: [] }];

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
  const name = fullName || username || user.email?.split("@")[0] || "Organizer";

  const totalRegistered = events.reduce((total, event) => total + event.attendeeCount, 0);
  const totalCheckedIn = events.reduce((total, event) => total + event.checkedInCount, 0);
  const activeStations = (stationResult.data ?? []).filter((station) => station.is_active).length;

  const statCards = [
    { label: "Events", value: events.length, icon: CalendarDays, note: "event dikelola" },
    { label: "Registered", value: totalRegistered, icon: UsersRound, note: "total attendee" },
    { label: "Checked in", value: totalCheckedIn, icon: TicketCheck, note: "sudah masuk" },
    { label: "QR active", value: qrResult.count ?? 0, icon: QrCode, note: "credential aktif" },
  ];

  return (
    <div className="app-surface min-h-screen text-neutral-950">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-orb ambient-orb-three" />

      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer
      />

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <BlurFade>
          <header className="organizer-welcome liquid-panel">
            <ShineBorder duration={18} borderWidth={1} />
            <div className="organizer-welcome-copy">
              <AnimatedShinyText className="dashboard-welcome-kicker">
                <Sparkles size={13} /> Organizer workspace
              </AnimatedShinyText>
              <h1>Kelola event dari satu workspace.</h1>
              <p>
                Pantau attendee, QR access, scanner, dan desain event dengan alur yang sama
                seperti dashboard utama PassFlow.
              </p>
            </div>
            <ShimmerButton asChild className="organizer-primary-cta">
              <Link href="/admin/events/new">
                <CirclePlus size={18} />
                Buat event
              </Link>
            </ShimmerButton>
          </header>
        </BlurFade>

        <section className="organizer-metrics" aria-label="Organizer metrics">
          {statCards.map(({ label, value, icon: Icon, note }, index) => (
            <BlurFade delay={0.04 + index * 0.035} key={label}>
              <MagicCard className="organizer-metric-card liquid-panel">
                {index === 0 && <BorderBeam duration={9} size={76} />}
                <div className="organizer-metric-icon">
                  <Icon size={17} />
                </div>
                <div className="organizer-metric-copy">
                  <span>{label}</span>
                  <strong>
                    <NumberTicker value={Number(value)} />
                  </strong>
                  <small>{note}</small>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </section>

        <section className="organizer-section" aria-labelledby="managed-events">
          <BlurFade delay={0.08}>
            <div className="organizer-section-heading">
              <div>
                <p className="section-kicker">Managed events</p>
                <h2 id="managed-events">Event kamu</h2>
              </div>
              <Link href="/admin/events/new" className="organizer-text-link">
                Tambah event <ArrowUpRight size={15} />
              </Link>
            </div>
          </BlurFade>

          {events.length > 0 ? (
            <div className="organizer-event-grid">
              {events.map((event, index) => {
                const percentage = Math.round(
                  event.attendeeCount ? (event.checkedInCount / event.attendeeCount) * 100 : 0,
                );

                return (
                  <BlurFade delay={0.1 + index * 0.035} key={event.id}>
                    <MagicCard className="organizer-event-card">
                      <Link href={`/admin/events/${event.id}`} className="organizer-event-card-link">
                        <div className="organizer-event-cover">
                          <span
                            className="organizer-event-color"
                            style={{ background: event.theme.primary }}
                          />
                          <div className="organizer-event-cover-top">
                            <span className="organizer-event-status">{event.status}</span>
                            <ArrowUpRight size={17} />
                          </div>
                          <div className="organizer-event-cover-copy">
                            <span>{event.eyebrow}</span>
                            <h3>{event.name}</h3>
                          </div>
                        </div>

                        <div className="organizer-event-body">
                          <div className="organizer-event-meta">
                            <span><CalendarDays size={14} /> {event.dateLabel}</span>
                            <span><MapPin size={14} /> {event.venue || "Venue belum ditentukan"}</span>
                          </div>

                          <div className="organizer-event-progress">
                            <div>
                              <span>Check-in progress</span>
                              <strong>{percentage}%</strong>
                            </div>
                            <div className="organizer-progress-track">
                              <span
                                style={{
                                  width: `${percentage}%`,
                                  background: event.theme.primary,
                                }}
                              />
                            </div>
                          </div>

                          <div className="organizer-event-footer">
                            <span>{event.checkedInCount} / {event.attendeeCount} checked in</span>
                            <strong>Manage</strong>
                          </div>
                        </div>
                      </Link>
                    </MagicCard>
                  </BlurFade>
                );
              })}
            </div>
          ) : (
            <BlurFade delay={0.1}>
              <MagicCard className="organizer-empty liquid-panel">
                <CirclePlus size={22} />
                <h3>Belum ada event.</h3>
                <p>Buat event pertama untuk mulai mengelola attendee, QR, dan access control.</p>
                <ShimmerButton asChild className="organizer-primary-cta">
                  <Link href="/admin/events/new">Buat event pertama</Link>
                </ShimmerButton>
              </MagicCard>
            </BlurFade>
          )}
        </section>

        <section className="organizer-section" id="stations" aria-labelledby="scanner-stations">
          <BlurFade delay={0.12}>
            <div className="organizer-section-heading">
              <div>
                <p className="section-kicker">Scanner network</p>
                <h2 id="scanner-stations">Access stations</h2>
              </div>
              <span className="organizer-soft-count">
                {activeStations} active
              </span>
            </div>
          </BlurFade>

          <BlurFade delay={0.15}>
            <div className="organizer-station-shell liquid-panel">
              <div className="organizer-station-summary">
                <span className="organizer-station-icon"><ScanLine size={19} /></span>
                <div>
                  <strong>{(stationResult.data ?? []).length} scanner station</strong>
                  <small>{activeStations} sedang aktif sekarang</small>
                </div>
              </div>

              <div className="organizer-station-list">
                {(stationResult.data ?? []).map(({ id, name: stationLabel, is_active }) => (
                  <Link href={`/scan/${id}`} className="organizer-station-card" key={id}>
                    <span className={`organizer-station-dot ${is_active ? "is-active" : ""}`} />
                    <div>
                      <strong>{stationLabel}</strong>
                      <small>{is_active ? "Active" : "Standby"}</small>
                    </div>
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
                {!(stationResult.data ?? []).length && (
                  <div className="organizer-station-empty">
                    Belum ada scanner station pada event yang kamu kelola.
                  </div>
                )}
              </div>
            </div>
          </BlurFade>
        </section>
      </main>
    </div>
  );
}
