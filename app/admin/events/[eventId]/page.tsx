import Link from "next/link";
import { CsvImportForm } from "@/components/csv-import-form";
import { DateTimeField, FormattedNumberInput, SmartSelect } from "@/components/form-fields";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Palette,
  QrCode,
  Ticket,
  Users,
} from "lucide-react";
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
  importAttendees,
  revokeCredential,
  setEventStatus,
  toggleStation,
  updateEvent,
  revokeCrew,
} from "@/app/admin/actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function inputClass() {
  return "mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
}

export default async function EventManagePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}`);
  const search = typeof query.q === "string" ? query.q.trim().replace(/[^\p{L}\p{N}@ ._-]/gu, "").slice(0, 80) : "";

  let attendeeQuery = supabase
    .from("attendees")
    .select("id, attendee_code, name, email, phone, checked_in_at, ticket_type_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) attendeeQuery = attendeeQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,attendee_code.ilike.%${search}%`);

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
    supabase.from("ticket_types").select("id, name, code, description, capacity, price, currency").eq("event_id", eventId).order("created_at"),
    attendeeQuery,
    supabase.from("qr_credentials").select("id, code, display_code, status, attendee_id, claimed_at, revoked_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(120),
    supabase.from("access_zones").select("id, name, code, description").eq("event_id", eventId).order("created_at"),
    supabase.from("access_rules").select("id, zone_id, ticket_type_id, allowed").eq("event_id", eventId),
    supabase.from("scanner_stations").select("id, name, slug, mode, zone_id, config, is_active").eq("event_id", eventId).order("created_at"),
    supabase.from("activities").select("id, name, code, description").eq("event_id", eventId).order("created_at"),
    supabase.from("benefits").select("id, name, code, description, is_active").eq("event_id", eventId).order("created_at"),
    supabase.from("scan_logs").select("id, decision, scanned_at, attendee_id, scanner_station_id, metadata").eq("event_id", eventId).order("scanned_at", { ascending: false }).limit(20),
    supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("benefit_claims").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("event_members").select("event_id,user_id,job_title,access_role,status,created_at").eq("event_id", eventId).order("created_at"),
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
  const denied = scans.filter((item) => item.decision === "denied" || item.decision === "invalid").length;

  return (
    <main className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="back-link"><ArrowLeft size={16} /> Dashboard</Link>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="section-kicker">{event.status}</span>
              <span className="soft-badge">{event.slug}</span>
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{event.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{event.dateLabel} · {event.venue}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="button button-ghost" href={`/admin/events/${event.id}/appearance`}><Palette size={16} /> Appearance</Link>
            <Link className="button button-ghost" href={`/admin/events/${event.id}/design`}>PassFlow Design</Link>
            <Link className="button button-dark" href={`/e/${event.slug}`}><ExternalLink size={16} /> Public page</Link>
          </div>
        </header>

        <nav className="my-6 flex gap-2 overflow-x-auto pb-2 text-sm">
          {["Overview","Tickets","Attendees","Wristbands","Access","Activities","Analytics"].map((label) => (
            <a key={label} href={`#${label.toLowerCase()}`} className="whitespace-nowrap rounded-full border border-border px-4 py-2">{label}</a>
          ))}
        </nav>

        <section id="overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Registered", event.attendeeCount, Users],
            ["Checked in", event.checkedInCount, Ticket],
            ["QR active", claimed, QrCode],
            ["Denied / invalid", denied, BarChart3],
          ].map(([label, value, Icon]) => {
            const IconComponent = Icon as typeof Users;
            return <article key={String(label)} className="rounded-lg border border-border bg-card p-5"><IconComponent size={18} /><p className="mt-5 text-sm text-muted-foreground">{String(label)}</p><strong className="text-3xl">{Number(value)}</strong></article>;
          })}
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><span className="section-kicker">Event settings</span><h2 className="mt-2 text-2xl font-semibold">Basics & lifecycle</h2></div></div>
          <form action={updateEvent} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="eventId" value={event.id} />
            <label className="text-sm font-medium sm:col-span-2">Name<input className={inputClass()} name="name" defaultValue={event.name} required /></label>
            <label className="text-sm font-medium">Slug<input className={inputClass()} name="slug" defaultValue={event.slug} required /></label>
            <label className="text-sm font-medium">Capacity<FormattedNumberInput name="capacity" defaultValue={event.capacity ?? ""} min={0} className={inputClass()} /></label>
            <label className="text-sm font-medium">Venue<input className={inputClass()} name="venue" defaultValue={event.venue} /></label>
            <DateTimeField name="startsAt" defaultValue={event.startsAt} label="Starts at" />
            <DateTimeField name="endsAt" defaultValue={event.endsAt} label="Ends at" />
            <label className="text-sm font-medium sm:col-span-2">Description<textarea className="mt-2 w-full rounded-md border border-input bg-background p-3" rows={3} name="description" defaultValue={event.description} /></label>
            <button className="button button-dark sm:col-span-2" type="submit">Save event</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
            {(["draft","published","archived"] as const).map((status) => (
              <form action={setEventStatus} key={status}>
                <input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="status" value={status} />
                <button className={`button ${event.status === status ? "button-dark" : "button-ghost"}`} type="submit">{status}</button>
              </form>
            ))}
          </div>
        </section>

        <section id="tickets" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <span className="section-kicker">Tickets</span><h2 className="mt-2 text-2xl font-semibold">Pass categories</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {tickets.map((ticket) => <article className="rounded-md bg-muted p-4" key={ticket.id}><strong>{ticket.name}</strong><p className="mt-1 text-xs text-muted-foreground">{ticket.code} · capacity {ticket.capacity ?? "∞"}</p><p className="mt-2 text-sm font-medium">{ticket.price > 0 ? `${ticket.currency} ${Number(ticket.price).toLocaleString("id-ID")}` : "Gratis"}</p><p className="mt-2 text-sm">{ticket.description}</p></article>)}
          </div>
          <form action={createTicketType} className="mt-5 grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="eventId" value={event.id} />
            <input className={inputClass()} name="name" placeholder="VIP Pass" required />
            <input className={inputClass()} name="code" placeholder="VIP" />
            <FormattedNumberInput name="capacity" min={0} className={inputClass()} placeholder="Capacity" />
            <FormattedNumberInput name="price" min={0} className={inputClass()} placeholder="Harga (0 = gratis)" />
            <SmartSelect name="currency" value="IDR" options={[{value:"IDR",label:"IDR · Rupiah"},{value:"USD",label:"USD · US Dollar"},{value:"SGD",label:"SGD · Singapore Dollar"}]} />
            <input className={inputClass()} name="description" placeholder="Description" />
            <button className="button button-dark sm:col-span-4" type="submit">Add ticket type</button>
          </form>
        </section>

        <section id="attendees" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="section-kicker">Attendees</span><h2 className="mt-2 text-2xl font-semibold">Registration list</h2></div>
            <a className="button button-ghost" href={`/admin/events/${event.id}/export/attendees`}>Export CSV</a>
            <form className="flex gap-2" method="get"><input className="min-h-10 rounded-md border border-input bg-background px-3 text-sm" name="q" defaultValue={search} placeholder="Search attendee" /><button className="button button-ghost" type="submit">Search</button></form>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Code</th><th>Name</th><th>Email</th><th>Pass</th><th>Check-in</th></tr></thead><tbody>
              {attendees.map((attendee) => <tr className="border-t border-border" key={attendee.id}><td className="py-3 font-mono text-xs">{attendee.attendee_code}</td><td>{attendee.name}</td><td>{attendee.email ?? "-"}</td><td>{attendee.ticket_type_id ? ticketName.get(attendee.ticket_type_id) ?? "-" : "-"}</td><td>{attendee.checked_in_at ? "Checked in" : "Pending"}</td></tr>)}
            </tbody></table>
          </div>
          <form action={createAttendee} className="mt-5 grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="eventId" value={event.id} />
            <input className={inputClass()} name="name" placeholder="Full name" required />
            <input className={inputClass()} name="email" type="email" placeholder="Email" />
            <input className={inputClass()} name="phone" placeholder="Phone" />
            <SmartSelect name="ticketTypeId" value="" options={[{value:"",label:"No pass type"}, ...tickets.map((ticket) => ({value:ticket.id,label:ticket.name}))]} />
            <button className="button button-dark sm:col-span-4" type="submit">Add attendee</button>
          </form>
          <CsvImportForm eventId={event.id} />
        </section>

        <section id="crew" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="section-kicker">Crew</span><h2 className="mt-2 text-2xl font-semibold">Event team</h2><p className="mt-2 text-sm text-muted-foreground">Buat link undangan untuk crew. Mereka masuk ke event ini saja.</p></div><span className="soft-badge">{crew.filter(member => member.status === "active").length} active</span></div>
          {typeof query.invite === "string" && <div className="mt-5 rounded-md border border-border bg-muted p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link undangan berhasil dibuat</p><p className="mt-2 break-all font-mono text-xs">{`${process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id"}/crew/join?token=${query.invite}`}</p><p className="mt-2 text-xs text-muted-foreground">Kirim link ini kepada crew. Link berlaku 7 hari.</p></div>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{crew.map(member => <div key={member.user_id} className="flex items-center justify-between rounded-md bg-muted p-3"><div><strong className="text-sm">{member.job_title}</strong><p className="text-xs text-muted-foreground">{member.access_role} · {member.status}</p></div>{member.status === "active" && <form action={revokeCrew}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="userId" value={member.user_id}/><button className="text-xs text-destructive hover:underline" type="submit">Revoke</button></form>}</div>)}</div>
          <form action={createCrewInvitation} className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-4"><input type="hidden" name="eventId" value={event.id}/><input className={inputClass()} name="jobTitle" placeholder="Job, mis. Gate Crew" required/><SmartSelect name="accessRole" value="crew" options={[{value:"crew",label:"Crew"},{value:"lead",label:"Lead"},{value:"scanner",label:"Scanner"}]} /><input className={inputClass()} name="email" type="email" placeholder="Email (opsional)"/><button className="button button-dark" type="submit">Buat link crew</button></form>
        </section>

        <section id="wristbands" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="section-kicker">QR wristbands</span><h2 className="mt-2 text-2xl font-semibold">{unclaimed} unclaimed · {claimed} active</h2></div>
            <Link className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}>Print QR batch</Link>
          </div>
          <form action={generateWristbands} className="mt-5 flex max-w-sm gap-2">
            <input type="hidden" name="eventId" value={event.id} />
            <FormattedNumberInput name="amount" min={1} max={250} defaultValue="10" className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3" />
            <button className="button button-dark" type="submit">Generate</button>
          </form>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {credentials.slice(0,24).map((qr) => <div key={qr.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><strong className="font-mono">{qr.display_code ?? "QR"}</strong><span className="text-xs uppercase text-muted-foreground">{qr.status}</span></div>{qr.status === "active" && <form action={revokeCredential} className="mt-3"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="credentialId" value={qr.id}/><button type="submit" className="text-xs text-destructive hover:underline">Revoke</button></form>}</div>)}
          </div>
        </section>

        <section id="access" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <span className="section-kicker">Access control</span><h2 className="mt-2 text-2xl font-semibold">Zones, rules & scanner stations</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div>
              <h3 className="font-semibold">Zones</h3>
              <div className="mt-3 space-y-2">{zones.map((zone)=><div className="rounded-md bg-muted p-3 text-sm" key={zone.id}><strong>{zone.name}</strong><br/><span className="text-xs text-muted-foreground">{zone.code}</span></div>)}</div>
              <form action={createZone} className="mt-3 space-y-2"><input type="hidden" name="eventId" value={event.id}/><input className={inputClass()} name="name" placeholder="VIP Lounge" required/><input className={inputClass()} name="code" placeholder="VIP_LOUNGE"/><button className="button button-ghost w-full" type="submit">Add zone</button></form>
            </div>
            <div>
              <h3 className="font-semibold">Access rules</h3>
              <div className="mt-3 space-y-2">{rules.map((rule)=><div className="rounded-md bg-muted p-3 text-xs" key={rule.id}>{zones.find(z=>z.id===rule.zone_id)?.name ?? "Zone"} · {ticketName.get(rule.ticket_type_id) ?? "Pass"} · <strong>{rule.allowed ? "ALLOW" : "DENY"}</strong></div>)}</div>
              <form action={createAccessRule} className="mt-3 space-y-2"><input type="hidden" name="eventId" value={event.id}/><SmartSelect name="zoneId" value="" options={[{value:"",label:"Zone"}, ...zones.map(z=>({value:z.id,label:z.name}))]} /><SmartSelect name="ticketTypeId" value="" options={[{value:"",label:"Pass type"}, ...tickets.map(t=>({value:t.id,label:t.name}))]} /><SmartSelect name="allowed" value="true" options={[{value:"true",label:"Allow"},{value:"false",label:"Deny"}]} /><button className="button button-ghost w-full" type="submit">Save rule</button></form>
            </div>
            <div>
              <h3 className="font-semibold">Stations</h3>
              <div className="mt-3 space-y-2">{stations.map((station)=><div className="rounded-md bg-muted p-3" key={station.id}><div className="flex items-center justify-between"><Link className="font-semibold hover:underline" href={`/scan/${station.id}`}>{station.name}</Link><span className="text-xs uppercase">{station.mode}</span></div><form action={toggleStation} className="mt-2"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="isActive" value={station.is_active ? "false":"true"}/><button className="text-xs text-muted-foreground hover:underline" type="submit">{station.is_active ? "Set standby":"Activate"}</button></form></div>)}</div>
              <form action={createStation} className="mt-3 space-y-2"><input type="hidden" name="eventId" value={event.id}/><input className={inputClass()} name="name" placeholder="Main Entrance" required/><input className={inputClass()} name="slug" placeholder="main-entrance"/><SmartSelect name="mode" value="check_in" options={[{value:"check_in",label:"Check-in"},{value:"zone_access",label:"Zone access"},{value:"activity",label:"Activity"},{value:"claim",label:"Benefit claim"}]} /><SmartSelect name="zoneId" value="" options={[{value:"",label:"No zone"}, ...zones.map(z=>({value:z.id,label:z.name}))]} /><input className={inputClass()} name="activityCode" placeholder="Activity code, optional"/><input className={inputClass()} name="benefitCode" placeholder="Benefit code, optional"/><button className="button button-dark w-full" type="submit">Create station</button></form>
            </div>
          </div>
        </section>

        <section id="activities" className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 sm:p-7">
            <span className="section-kicker">Activities</span><h2 className="mt-2 text-2xl font-semibold">Checkpoints</h2>
            <div className="mt-4 space-y-2">{activities.map(a=><div className="rounded-md bg-muted p-3" key={a.id}><strong>{a.name}</strong><span className="ml-2 text-xs text-muted-foreground">{a.code}</span></div>)}</div>
            <form action={createActivity} className="mt-4 grid gap-2"><input type="hidden" name="eventId" value={event.id}/><input className={inputClass()} name="name" placeholder="Workshop A" required/><input className={inputClass()} name="code" placeholder="WORKSHOP_A"/><input className={inputClass()} name="description" placeholder="Description"/><button className="button button-ghost" type="submit">Add activity</button></form>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 sm:p-7">
            <span className="section-kicker">Benefits</span><h2 className="mt-2 text-2xl font-semibold">One-time claims</h2>
            <div className="mt-4 space-y-2">{benefits.map(b=><div className="rounded-md bg-muted p-3" key={b.id}><strong>{b.name}</strong><span className="ml-2 text-xs text-muted-foreground">{b.code}</span></div>)}</div>
            <form action={createBenefit} className="mt-4 grid gap-2"><input type="hidden" name="eventId" value={event.id}/><input className={inputClass()} name="name" placeholder="Merch Pack" required/><input className={inputClass()} name="code" placeholder="MERCH_PACK"/><input className={inputClass()} name="description" placeholder="Description"/><button className="button button-ghost" type="submit">Add benefit</button></form>
          </div>
        </section>

        <section id="analytics" className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-2"><BarChart3 size={19}/><span className="section-kicker">Analytics</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-muted p-4"><small>Scans shown</small><strong className="mt-2 block text-2xl">{scans.length}</strong></div>
            <div className="rounded-md bg-muted p-4"><small>Activity logs</small><strong className="mt-2 block text-2xl">{activityCountResult.count ?? 0}</strong></div>
            <div className="rounded-md bg-muted p-4"><small>Benefit claims</small><strong className="mt-2 block text-2xl">{benefitCountResult.count ?? 0}</strong></div>
            <div className="rounded-md bg-muted p-4"><small>Unclaimed QR</small><strong className="mt-2 block text-2xl">{unclaimed}</strong></div>
          </div>
          <div className="mt-5 space-y-2">
            {scans.map((scan)=><div className="grid gap-1 rounded-md border border-border p-3 text-sm sm:grid-cols-[1fr_1fr_auto]" key={scan.id}><span>{scan.attendee_id ? attendeeName.get(scan.attendee_id) ?? "Attendee" : "Unknown pass"}</span><span>{scan.scanner_station_id ? stationName.get(scan.scanner_station_id) ?? "Station" : "Station"}</span><strong className="uppercase">{scan.decision}</strong></div>)}
            {scans.length === 0 && <p className="text-sm text-muted-foreground">Belum ada scan log.</p>}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-destructive/20 p-5">
          <h2 className="font-semibold text-destructive">Danger zone</h2>
          <p className="mt-2 text-sm text-muted-foreground">Untuk menghapus event, ketik slug persis. Semua attendee, QR, station, dan log event akan ikut terhapus.</p>
          <form action={deleteEvent} className="mt-4 flex max-w-lg gap-2"><input type="hidden" name="eventId" value={event.id}/><input className="min-h-11 flex-1 rounded-md border border-input bg-background px-3" name="confirmation" placeholder={event.slug}/><button className="button button-ghost text-destructive" type="submit">Delete event</button></form>
        </section>
      </div>
    </main>
  );
}
