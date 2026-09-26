import { Search } from "lucide-react";
import { PeopleRecordEditor } from "@/components/people-record-editor";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { CsvImportForm } from "@/components/csv-import-form";
import { AvatarCircles } from "@/components/magicui/avatar-circles";
import { FormattedNumberInput, SmartSelect } from "@/components/form-fields";
import {
  createAttendee,
  createCrewInvitation,
  createTicketType,
  revokeCrew,
} from "@/app/admin/actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function inputClass() {
  return "event-admin-input";
}

export default async function EventPeoplePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;

  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/people`);
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

  const [ticketsResult, attendeesResult, crewResult] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, code, description, capacity, price, currency")
      .eq("event_id", eventId)
      .order("created_at"),
    attendeeQuery,
    supabase
      .from("event_members")
      .select("event_id,user_id,job_title,access_role,status,created_at")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);

  const tickets = ticketsResult.data ?? [];
  const attendees = attendeesResult.data ?? [];
  const crew = crewResult.data ?? [];
  const ticketName = new Map(tickets.map((ticket) => [ticket.id, ticket.name]));

  return (
    <>
      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">People</span>
            <h2>Tickets & pass categories</h2>
            <p>Atur tipe pass yang digunakan attendee di event ini.</p>
          </div>
          <span className="event-admin-section-count">{tickets.length} types</span>
        </div>

        <div className="event-admin-card-grid">
          {tickets.map((ticket) => (
            <div className="event-admin-mini-card" key={ticket.id}>
              <div className="event-admin-mini-top">
                <span className="event-admin-code">{ticket.code}</span>
              </div>
              <h3>{ticket.name}</h3>
              <PeopleRecordEditor eventId={eventId} kind="ticket" record={ticket}/>
              <p>{ticket.description || "Tanpa deskripsi."}</p>
              <div className="event-admin-mini-meta">
                <span>{ticket.capacity ?? "∞"} capacity</span>
                <strong>
                  {ticket.price > 0
                    ? `${ticket.currency} ${Number(ticket.price).toLocaleString("id-ID")}`
                    : "Gratis"}
                </strong>
              </div>
            </div>
          ))}
          {!tickets.length && (
            <div className="event-admin-empty-card">
              <strong>Belum ada pass category</strong>
              <span>Tambahkan kategori tiket pertama dari form di bawah.</span>
            </div>
          )}
        </div>

        <form action={createTicketType} className="event-admin-inline-form event-admin-inline-form-3">
          <input type="hidden" name="eventId" value={eventId} />
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
            Add ticket type
          </button>
        </form>
      </section>

      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head event-admin-section-head-wrap">
          <div>
            <span className="section-kicker">Attendees</span>
            <h2>Registration list</h2>
            <p>{attendees.length} attendee ditampilkan dari hasil saat ini.</p>
          </div>
          <div className="event-admin-head-actions">
            <AvatarCircles
              people={attendees.slice(0, 5).map((attendee) => ({ name: attendee.name }))}
              extra={Math.max(0, attendees.length - 5)}
            />
            <a className="button button-ghost" href={`/admin/events/${eventId}/export/attendees`}>
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
                <th>Kelola</th>
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
                  <td><PeopleRecordEditor eventId={eventId} kind="attendee" record={attendee} tickets={tickets}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!attendees.length && <div className="event-admin-table-empty">Belum ada attendee.</div>}
        </div>

        <form action={createAttendee} className="event-admin-inline-form event-admin-inline-form-4">
          <input type="hidden" name="eventId" value={eventId} />
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
          <button className="button button-dark event-admin-inline-submit" type="submit">Add attendee</button>
        </form>

        <div className="event-admin-import-shell">
          <CsvImportForm eventId={eventId} />
        </div>
      </section>

      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Crew</span>
            <h2>Event team</h2>
            <p>Buat akses terbatas untuk orang yang bekerja pada event ini.</p>
          </div>
          <span className="event-admin-section-count">
            {crew.filter((member) => member.status === "active").length} active
          </span>
        </div>

        {typeof query.invite === "string" && (
          <div className="event-admin-invite-banner">
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
              <div>
                <strong>{member.job_title}</strong>
                <small>{member.access_role} · {member.status}</small>
              </div>
              {member.status === "active" && (
                <form action={revokeCrew}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="userId" value={member.user_id} />
                  <button className="event-admin-danger-link" type="submit">Revoke</button>
                </form>
              )}
            </div>
          ))}
          {!crew.length && (
            <div className="event-admin-empty-card">
              <strong>Belum ada crew</strong>
              <span>Buat link undangan untuk menambahkan anggota tim.</span>
            </div>
          )}
        </div>

        <form action={createCrewInvitation} className="event-admin-inline-form event-admin-inline-form-4">
          <input type="hidden" name="eventId" value={eventId} />
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
          <button className="button button-dark event-admin-inline-submit" type="submit">Buat link crew</button>
        </form>
      </section>
    </>
  );
}
