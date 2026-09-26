import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CirclePlus,
  ExternalLink,
  Gift,
  Palette,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";
import { CsvImportForm } from "@/components/csv-import-form";
import { DateTimeField, FormattedNumberInput, SmartSelect } from "@/components/form-fields";
import { UserNavbar } from "@/components/user-navbar";
import { EventSectionDock } from "@/components/event-section-dock";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MagicCard } from "@/components/magicui/magic-card";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import {
  createAccessRule,
  createActivity,
  createAttendee,
  createBenefit,
  createCrewInvitation,
  createStation,
  createTicketType,
  createZone,
  deleteEvent,
  generateWristbands,
  revokeCredential,
  revokeCrew,
  setEventStatus,
  toggleStation,
  updateEvent,
} from "@/app/admin/actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function inputClass() {
  return "event-admin-input";
}

export default async function EventManagePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase, user } = await requireOrganizerMembership(`/admin/events/${eventId}`);
  const search =
    typeof query.q === "string"
      ? query.q.trim().replace(/[^\p{L}\p{N}@ ._-]/gu, "").slice(0, 80)
      : "";

  let attendeeQuery = supabase
    .from("attendees")
    .select("id, attendee_code, name, email, phone, checked_in_at, ticket_type_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) {
    attendeeQuery = attendeeQuery.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,attendee_code.ilike.%${search}%`,
    );
  }

  const [
    ticketsResult,
    attendeesResult,
    credentialsResult,
    zonesResult,
    rulesResult,
    stationsResult,
    activitiesResult,
    benefitsResult,
    scansResult,
    activityCountResult,
    benefitCountResult,
    eventMembersResult,
  ] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, code, description, capacity, price, currency")
      .eq("event_id", eventId)
      .order("created_at"),
    attendeeQuery,
    supabase
      .from("qr_credentials")
      .select("id, code, display_code, status, attendee_id, claimed_at, revoked_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("access_zones")
      .select("id, name, code, description")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("access_rules")
      .select("id, zone_id, ticket_type_id, allowed")
      .eq("event_id", eventId),
    supabase
      .from("scanner_stations")
      .select("id, name, slug, mode, zone_id, config, is_active")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("activities")
      .select("id, name, code, description")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("benefits")
      .select("id, name, code, description, is_active")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("scan_logs")
      .select("id, decision, scanned_at, attendee_id, scanner_station_id, metadata")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("benefit_claims")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("event_members")
      .select("event_id,user_id,job_title,access_role,status,created_at")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);

  const tickets = ticketsResult.data ?? [];
  const attendees = attendeesResult.data ?? [];
  const credentials = credentialsResult.data ?? [];
  const zones = zonesResult.data ?? [];
  const rules = rulesResult.data ?? [];
  const stations = stationsResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const benefits = benefitsResult.data ?? [];
  const crew = eventMembersResult.data ?? [];
  const scans = scansResult.data ?? [];

  const ticketName = new Map(tickets.map((ticket) => [ticket.id, ticket.name]));
  const attendeeName = new Map(attendees.map((attendee) => [attendee.id, attendee.name]));
  const stationName = new Map(stations.map((station) => [station.id, station.name]));

  const claimed = credentials.filter((item) => item.status === "active").length;
  const unclaimed = credentials.filter((item) => item.status === "unclaimed").length;
  const denied = scans.filter(
    (item) => item.decision === "denied" || item.decision === "invalid",
  ).length;

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

  const metrics = [
    { label: "Registered", value: event.attendeeCount, icon: Users, note: "attendee" },
    { label: "Checked in", value: event.checkedInCount, icon: Ticket, note: "sudah masuk" },
    { label: "QR active", value: claimed, icon: QrCode, note: "credential" },
    { label: "Denied", value: denied, icon: BarChart3, note: "scan terbaru" },
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

      <main className="event-admin-shell relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <BlurFade>
          <header className="event-admin-hero liquid-panel">
            <ShineBorder duration={20} borderWidth={1} />
            <div className="event-admin-hero-main">
              <Link href="/admin" className="event-admin-back">
                <ArrowLeft size={15} /> Organizer
              </Link>

              <AnimatedShinyText className="event-admin-kicker">
                <Sparkles size={13} />
                {event.status} event
              </AnimatedShinyText>

              <div className="event-admin-title-row">
                <div>
                  <h1>{event.name}</h1>
                  <p>{event.dateLabel} · {event.venue || "Venue belum ditentukan"}</p>
                </div>
                <span className="event-admin-slug">{event.slug}</span>
              </div>
            </div>

            <div className="event-admin-hero-actions">
              <Link className="button button-ghost" href={`/admin/events/${event.id}/appearance`}>
                <Palette size={16} /> Customize
              </Link>
              <Link className="button button-ghost" href={`/admin/events/${event.id}/design`}>
                <Sparkles size={16} /> PassFlow Design
              </Link>
              <ShimmerButton asChild className="event-admin-public-cta">
                <Link href={`/e/${event.slug}`}>
                  <ExternalLink size={16} /> Public page
                </Link>
              </ShimmerButton>
            </div>
          </header>
        </BlurFade>

        <BlurFade delay={0.03}>
          <EventSectionDock />
        </BlurFade>

        <section id="overview" className="event-admin-metrics" aria-label="Event overview">
          {metrics.map(({ label, value, icon: Icon, note }, index) => (
            <BlurFade delay={0.05 + index * 0.03} key={label}>
              <MagicCard className="event-admin-metric liquid-panel">
                {index === 0 && <BorderBeam duration={8} size={72} />}
                <span className="event-admin-metric-icon"><Icon size={17} /></span>
                <div>
                  <span>{label}</span>
                  <strong><NumberTicker value={Number(value)} /></strong>
                  <small>{note}</small>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </section>

        <BlurFade delay={0.08}>
          <section className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Event settings</span>
                <h2>Basics & lifecycle</h2>
                <p>Informasi inti event, jadwal, kapasitas, dan status publikasi.</p>
              </div>
              <span className="event-admin-section-icon"><ShieldCheck size={18} /></span>
            </div>

            <form action={updateEvent} className="event-admin-form-grid">
              <input type="hidden" name="eventId" value={event.id} />
              <label className="event-admin-field is-wide">
                <span>Name</span>
                <input className={inputClass()} name="name" defaultValue={event.name} required />
              </label>
              <label className="event-admin-field">
                <span>Slug</span>
                <input className={inputClass()} name="slug" defaultValue={event.slug} required />
              </label>
              <label className="event-admin-field">
                <span>Capacity</span>
                <FormattedNumberInput
                  name="capacity"
                  defaultValue={event.capacity ?? ""}
                  min={0}
                  className={inputClass()}
                />
              </label>
              <label className="event-admin-field is-wide">
                <span>Venue</span>
                <input className={inputClass()} name="venue" defaultValue={event.venue} />
              </label>
              <DateTimeField name="startsAt" defaultValue={event.startsAt} label="Starts at" />
              <DateTimeField name="endsAt" defaultValue={event.endsAt} label="Ends at" />
              <label className="event-admin-field is-wide">
                <span>Description</span>
                <textarea
                  className="event-admin-input event-admin-textarea"
                  rows={4}
                  name="description"
                  defaultValue={event.description}
                />
              </label>
              <div className="event-admin-form-actions is-wide">
                <button className="button button-dark" type="submit">Save changes</button>
              </div>
            </form>

            <div className="event-admin-status-row">
              <div>
                <strong>Event status</strong>
                <span>Pilih lifecycle event tanpa masuk ke halaman lain.</span>
              </div>
              <div className="event-admin-status-actions">
                {(["draft", "published", "archived"] as const).map((status) => (
                  <form action={setEventStatus} key={status}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="status" value={status} />
                    <button
                      className={`event-admin-status-button ${event.status === status ? "is-active" : ""}`}
                      type="submit"
                    >
                      {status}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.1}>
          <section id="tickets" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Tickets</span>
                <h2>Pass categories</h2>
                <p>Atur tipe pass, kapasitas, dan harga yang tersedia untuk attendee.</p>
              </div>
              <span className="event-admin-section-count">{tickets.length} types</span>
            </div>

            <div className="event-admin-card-grid">
              {tickets.map((ticket) => (
                <MagicCard className="event-admin-mini-card" key={ticket.id}>
                  <div className="event-admin-mini-top">
                    <span className="event-admin-code">{ticket.code}</span>
                    <Ticket size={16} />
                  </div>
                  <h3>{ticket.name}</h3>
                  <p>{ticket.description || "Tanpa deskripsi."}</p>
                  <div className="event-admin-mini-meta">
                    <span>{ticket.capacity ?? "∞"} capacity</span>
                    <strong>
                      {ticket.price > 0
                        ? `${ticket.currency} ${Number(ticket.price).toLocaleString("id-ID")}`
                        : "Gratis"}
                    </strong>
                  </div>
                </MagicCard>
              ))}
              {tickets.length === 0 && (
                <div className="event-admin-empty-card">
                  <Ticket size={20} />
                  <strong>Belum ada pass category</strong>
                  <span>Tambahkan kategori tiket pertama dari form di bawah.</span>
                </div>
              )}
            </div>

            <form action={createTicketType} className="event-admin-inline-form event-admin-inline-form-3">
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="name" placeholder="VIP Pass" required />
              <input className={inputClass()} name="code" placeholder="VIP" />
              <FormattedNumberInput name="capacity" min={0} className={inputClass()} placeholder="Capacity" />
              <FormattedNumberInput name="price" min={0} className={inputClass()} placeholder="Harga" />
              <SmartSelect
                name="currency"
                value="IDR"
                options={[
                  { value: "IDR", label: "IDR · Rupiah" },
                  { value: "USD", label: "USD · US Dollar" },
                  { value: "SGD", label: "SGD · Singapore Dollar" },
                ]}
              />
              <input className={inputClass()} name="description" placeholder="Description" />
              <button className="button button-dark event-admin-inline-submit" type="submit">
                <CirclePlus size={15} /> Add ticket type
              </button>
            </form>
          </section>
        </BlurFade>

        <BlurFade delay={0.12}>
          <section id="attendees" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head event-admin-section-head-wrap">
              <div>
                <span className="section-kicker">Attendees</span>
                <h2>Registration list</h2>
                <p>Kelola daftar peserta, tipe pass, dan status check-in.</p>
              </div>
              <div className="event-admin-head-actions">
                <a className="button button-ghost" href={`/admin/events/${event.id}/export/attendees`}>
                  Export CSV
                </a>
                <form className="event-admin-search" method="get">
                  <Search size={15} />
                  <input name="q" defaultValue={search} placeholder="Search attendee" />
                  <button type="submit">Search</button>
                </form>
              </div>
            </div>

            <div className="event-admin-table-shell">
              <table className="event-admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Pass</th>
                    <th>Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td><code>{attendee.attendee_code}</code></td>
                      <td><strong>{attendee.name}</strong></td>
                      <td>{attendee.email ?? "-"}</td>
                      <td>{attendee.ticket_type_id ? ticketName.get(attendee.ticket_type_id) ?? "-" : "-"}</td>
                      <td>
                        <span className={`event-admin-state ${attendee.checked_in_at ? "is-success" : ""}`}>
                          {attendee.checked_in_at ? "Checked in" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendees.length === 0 && (
                <div className="event-admin-table-empty">Belum ada attendee.</div>
              )}
            </div>

            <form action={createAttendee} className="event-admin-inline-form event-admin-inline-form-4">
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="name" placeholder="Full name" required />
              <input className={inputClass()} name="email" type="email" placeholder="Email" />
              <input className={inputClass()} name="phone" placeholder="Phone" />
              <SmartSelect
                name="ticketTypeId"
                value=""
                options={[
                  { value: "", label: "No pass type" },
                  ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name })),
                ]}
              />
              <button className="button button-dark event-admin-inline-submit" type="submit">
                <CirclePlus size={15} /> Add attendee
              </button>
            </form>

            <div className="event-admin-import-shell">
              <CsvImportForm eventId={event.id} />
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.14}>
          <section id="crew" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Crew</span>
                <h2>Event team</h2>
                <p>Buat akses terbatas untuk crew yang bekerja hanya pada event ini.</p>
              </div>
              <span className="event-admin-section-count">
                {crew.filter((member) => member.status === "active").length} active
              </span>
            </div>

            {typeof query.invite === "string" && (
              <div className="event-admin-invite-banner">
                <UserCog size={17} />
                <div>
                  <strong>Link undangan berhasil dibuat</strong>
                  <code>
                    {`${process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id"}/crew/join?token=${query.invite}`}
                  </code>
                  <span>Link berlaku 7 hari.</span>
                </div>
              </div>
            )}

            <div className="event-admin-list-grid">
              {crew.map((member) => (
                <div key={member.user_id} className="event-admin-list-card">
                  <span className="event-admin-list-icon"><UserCog size={16} /></span>
                  <div>
                    <strong>{member.job_title}</strong>
                    <small>{member.access_role} · {member.status}</small>
                  </div>
                  {member.status === "active" && (
                    <form action={revokeCrew}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="userId" value={member.user_id} />
                      <button className="event-admin-danger-link" type="submit">Revoke</button>
                    </form>
                  )}
                </div>
              ))}
              {crew.length === 0 && (
                <div className="event-admin-empty-card">
                  <UserCog size={20} />
                  <strong>Belum ada crew</strong>
                  <span>Buat link undangan untuk menambahkan anggota tim.</span>
                </div>
              )}
            </div>

            <form action={createCrewInvitation} className="event-admin-inline-form event-admin-inline-form-4">
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="jobTitle" placeholder="Gate Crew" required />
              <SmartSelect
                name="accessRole"
                value="crew"
                options={[
                  { value: "crew", label: "Crew" },
                  { value: "lead", label: "Lead" },
                  { value: "scanner", label: "Scanner" },
                ]}
              />
              <input className={inputClass()} name="email" type="email" placeholder="Email (opsional)" />
              <button className="button button-dark event-admin-inline-submit" type="submit">
                <CirclePlus size={15} /> Buat link crew
              </button>
            </form>
          </section>
        </BlurFade>

        <BlurFade delay={0.16}>
          <section id="wristbands" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head event-admin-section-head-wrap">
              <div>
                <span className="section-kicker">QR wristbands</span>
                <h2>{unclaimed} unclaimed · {claimed} active</h2>
                <p>Generate, print, dan revoke QR credential dari satu panel.</p>
              </div>
              <Link className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}>
                Print QR batch
              </Link>
            </div>

            <div className="event-admin-generate-row">
              <form action={generateWristbands}>
                <input type="hidden" name="eventId" value={event.id} />
                <FormattedNumberInput
                  name="amount"
                  min={1}
                  max={250}
                  defaultValue="10"
                  className={inputClass()}
                />
                <button className="button button-dark" type="submit">
                  <QrCode size={15} /> Generate
                </button>
              </form>
              <span>Generate maksimal 250 QR per batch.</span>
            </div>

            <div className="event-admin-credential-grid">
              {credentials.slice(0, 24).map((qr) => (
                <div key={qr.id} className="event-admin-credential-card">
                  <div>
                    <strong>{qr.display_code ?? "QR"}</strong>
                    <span className={`event-admin-state ${qr.status === "active" ? "is-success" : ""}`}>
                      {qr.status}
                    </span>
                  </div>
                  {qr.status === "active" && (
                    <form action={revokeCredential}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="credentialId" value={qr.id} />
                      <button type="submit" className="event-admin-danger-link">Revoke</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.18}>
          <section id="access" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Access control</span>
                <h2>Zones, rules & scanner stations</h2>
                <p>Bangun alur akses fisik event tanpa berpindah halaman.</p>
              </div>
              <span className="event-admin-section-icon"><Workflow size={18} /></span>
            </div>

            <div className="event-admin-access-grid">
              <div className="event-admin-subpanel">
                <div className="event-admin-subpanel-head">
                  <span className="event-admin-list-icon"><ShieldCheck size={15} /></span>
                  <div><strong>Zones</strong><small>{zones.length} zone</small></div>
                </div>
                <div className="event-admin-stack">
                  {zones.map((zone) => (
                    <div className="event-admin-row-card" key={zone.id}>
                      <strong>{zone.name}</strong>
                      <span>{zone.code}</span>
                    </div>
                  ))}
                </div>
                <form action={createZone} className="event-admin-stack event-admin-subform">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input className={inputClass()} name="name" placeholder="VIP Lounge" required />
                  <input className={inputClass()} name="code" placeholder="VIP_LOUNGE" />
                  <button className="button button-ghost" type="submit">Add zone</button>
                </form>
              </div>

              <div className="event-admin-subpanel">
                <div className="event-admin-subpanel-head">
                  <span className="event-admin-list-icon"><Workflow size={15} /></span>
                  <div><strong>Access rules</strong><small>{rules.length} rule</small></div>
                </div>
                <div className="event-admin-stack">
                  {rules.map((rule) => (
                    <div className="event-admin-row-card" key={rule.id}>
                      <strong>{zones.find((zone) => zone.id === rule.zone_id)?.name ?? "Zone"}</strong>
                      <span>{ticketName.get(rule.ticket_type_id) ?? "Pass"} · {rule.allowed ? "ALLOW" : "DENY"}</span>
                    </div>
                  ))}
                </div>
                <form action={createAccessRule} className="event-admin-stack event-admin-subform">
                  <input type="hidden" name="eventId" value={event.id} />
                  <SmartSelect
                    name="zoneId"
                    value=""
                    options={[{ value: "", label: "Zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]}
                  />
                  <SmartSelect
                    name="ticketTypeId"
                    value=""
                    options={[{ value: "", label: "Pass type" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]}
                  />
                  <SmartSelect
                    name="allowed"
                    value="true"
                    options={[{ value: "true", label: "Allow" }, { value: "false", label: "Deny" }]}
                  />
                  <button className="button button-ghost" type="submit">Save rule</button>
                </form>
              </div>

              <div className="event-admin-subpanel">
                <div className="event-admin-subpanel-head">
                  <span className="event-admin-list-icon"><ScanLine size={15} /></span>
                  <div><strong>Stations</strong><small>{stations.length} scanner</small></div>
                </div>
                <div className="event-admin-stack">
                  {stations.map((station) => (
                    <div className="event-admin-row-card event-admin-station-row" key={station.id}>
                      <Link href={`/scan/${station.id}`}>{station.name}</Link>
                      <span>{station.mode}</span>
                      <form action={toggleStation}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="isActive" value={station.is_active ? "false" : "true"} />
                        <button className="event-admin-text-action" type="submit">
                          {station.is_active ? "Set standby" : "Activate"}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={createStation} className="event-admin-stack event-admin-subform">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input className={inputClass()} name="name" placeholder="Main Entrance" required />
                  <input className={inputClass()} name="slug" placeholder="main-entrance" />
                  <SmartSelect
                    name="mode"
                    value="check_in"
                    options={[
                      { value: "check_in", label: "Check-in" },
                      { value: "zone_access", label: "Zone access" },
                      { value: "activity", label: "Activity" },
                      { value: "claim", label: "Benefit claim" },
                    ]}
                  />
                  <SmartSelect
                    name="zoneId"
                    value=""
                    options={[{ value: "", label: "No zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]}
                  />
                  <input className={inputClass()} name="activityCode" placeholder="Activity code, optional" />
                  <input className={inputClass()} name="benefitCode" placeholder="Benefit code, optional" />
                  <button className="button button-dark" type="submit">Create station</button>
                </form>
              </div>
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.2}>
          <section id="activities" className="event-admin-dual-grid">
            <MagicCard className="event-admin-section liquid-panel">
              <div className="event-admin-section-head">
                <div>
                  <span className="section-kicker">Activities</span>
                  <h2>Checkpoints</h2>
                  <p>Catat keikutsertaan attendee pada aktivitas event.</p>
                </div>
                <span className="event-admin-section-icon"><Activity size={18} /></span>
              </div>
              <div className="event-admin-stack">
                {activities.map((activity) => (
                  <div className="event-admin-row-card" key={activity.id}>
                    <strong>{activity.name}</strong>
                    <span>{activity.code}</span>
                  </div>
                ))}
              </div>
              <form action={createActivity} className="event-admin-stack event-admin-subform">
                <input type="hidden" name="eventId" value={event.id} />
                <input className={inputClass()} name="name" placeholder="Workshop A" required />
                <input className={inputClass()} name="code" placeholder="WORKSHOP_A" />
                <input className={inputClass()} name="description" placeholder="Description" />
                <button className="button button-ghost" type="submit">Add activity</button>
              </form>
            </MagicCard>

            <MagicCard className="event-admin-section liquid-panel">
              <div className="event-admin-section-head">
                <div>
                  <span className="section-kicker">Benefits</span>
                  <h2>One-time claims</h2>
                  <p>Kelola benefit yang hanya boleh diklaim satu kali.</p>
                </div>
                <span className="event-admin-section-icon"><Gift size={18} /></span>
              </div>
              <div className="event-admin-stack">
                {benefits.map((benefit) => (
                  <div className="event-admin-row-card" key={benefit.id}>
                    <strong>{benefit.name}</strong>
                    <span>{benefit.code}</span>
                  </div>
                ))}
              </div>
              <form action={createBenefit} className="event-admin-stack event-admin-subform">
                <input type="hidden" name="eventId" value={event.id} />
                <input className={inputClass()} name="name" placeholder="Merch Pack" required />
                <input className={inputClass()} name="code" placeholder="MERCH_PACK" />
                <input className={inputClass()} name="description" placeholder="Description" />
                <button className="button button-ghost" type="submit">Add benefit</button>
              </form>
            </MagicCard>
          </section>
        </BlurFade>

        <BlurFade delay={0.22}>
          <section id="analytics" className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Analytics</span>
                <h2>Recent event activity</h2>
                <p>Ringkasan scan, aktivitas, benefit claim, dan QR yang belum diklaim.</p>
              </div>
              <span className="event-admin-section-icon"><BarChart3 size={18} /></span>
            </div>

            <div className="event-admin-analytics-grid">
              {[
                ["Scans shown", scans.length],
                ["Activity logs", activityCountResult.count ?? 0],
                ["Benefit claims", benefitCountResult.count ?? 0],
                ["Unclaimed QR", unclaimed],
              ].map(([label, value]) => (
                <div className="event-admin-analytics-card" key={String(label)}>
                  <span>{String(label)}</span>
                  <strong><NumberTicker value={Number(value)} /></strong>
                </div>
              ))}
            </div>

            <div className="event-admin-scan-list">
              {scans.map((scan) => (
                <div className="event-admin-scan-row" key={scan.id}>
                  <span>
                    {scan.attendee_id ? attendeeName.get(scan.attendee_id) ?? "Attendee" : "Unknown pass"}
                  </span>
                  <span>
                    {scan.scanner_station_id ? stationName.get(scan.scanner_station_id) ?? "Station" : "Station"}
                  </span>
                  <strong className={`event-admin-scan-decision is-${scan.decision}`}>
                    {scan.decision}
                  </strong>
                </div>
              ))}
              {scans.length === 0 && (
                <div className="event-admin-table-empty">Belum ada scan log.</div>
              )}
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.24}>
          <section className="event-admin-danger-zone">
            <div className="event-admin-danger-copy">
              <span className="event-admin-danger-icon"><Trash2 size={17} /></span>
              <div>
                <strong>Delete event</strong>
                <p>
                  Ketik slug <code>{event.slug}</code> untuk menghapus event beserta attendee,
                  QR, station, dan log terkait.
                </p>
              </div>
            </div>
            <form action={deleteEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="confirmation" placeholder={event.slug} />
              <button className="button button-ghost event-admin-delete-button" type="submit">
                Delete event
              </button>
            </form>
          </section>
        </BlurFade>
      </main>
    </div>
  );
}
