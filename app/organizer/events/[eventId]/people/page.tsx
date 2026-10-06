import { attendeePhotoColumns, attendeePhotoUrls } from "@/lib/attendee-photos";
import { Search } from "lucide-react";
import { PeopleRecordEditor } from "@/components/people-record-editor";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { CsvImportForm } from "@/components/csv-import-form";
import { FormDialog, PopupPanel } from "@/components/form-dialog";
import { AvatarCircles } from "@/components/magicui/avatar-circles";
import { FormattedNumberInput, SmartSelect } from "@/components/form-fields";
import {
  createAttendee,
  createCrewInvitation,
  createTicketType,
  revokeCrew,
} from "@/app/organizer/events/actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventPeoplePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;

  const { supabase } = await requireOrganizerMembership(`/organizer/events/${eventId}/people`);
  const search =
    typeof query.q === "string"
      ? query.q.trim().replace(/[^\p{L}\p{N}@ ._-]/gu, "").slice(0, 80)
      : "";

  let attendeeQuery = supabase
    .from("attendees")
    .select("id, attendee_code, name, email, phone, checked_in_at, ticket_type_id, user_id")
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

  const attendeeIds = attendees.map((attendee) => attendee.id);
  const { data: attendeeProfileRows } = attendeeIds.length
    ? await supabase
        .from("attendee_profiles")
        .select(attendeePhotoColumns)
        .eq("event_id", eventId)
        .in("attendee_id", attendeeIds)
    : { data: [] };
  const photos = await attendeePhotoUrls(supabase, attendeeProfileRows);
  const attendeePhoto = new Map(attendees.map((attendee) => [attendee.id, photos.get(attendee.id) ?? null]));

  return (
    <>
      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">People</span>
            <h2>Tickets & pass categories</h2>
            <p>Configure the pass categories available to attendees for this event.</p>
          </div>
          <div className="event-admin-head-actions">
            <span className="event-admin-section-count">{tickets.length} types</span>
          <FormDialog trigger="Add ticket type" title="Add ticket type" description="A pass category attendees can register for. Access rules and Figma pass designs can target it." action={createTicketType} submitLabel="Add ticket type">
                          <input type="hidden" name="eventId" value={eventId} />
              <label>Name<input name="name" placeholder="VIP Access" required maxLength={100} /></label>
              <label>Code <small>Optional, made from the name</small><input name="code" placeholder="VIP" maxLength={40} /></label>
              <div className="record-row">
                <label>Capacity <small>Blank is unlimited</small><FormattedNumberInput name="capacity" min={0} placeholder="250" /></label>
                <label>Price<FormattedNumberInput name="price" min={0} placeholder="150,000" /></label>
              </div>
              <label>Currency<SmartSelect name="currency" value="IDR" options={[{ value: "IDR", label: "IDR · Rupiah" }, { value: "USD", label: "USD · US Dollar" }, { value: "SGD", label: "SGD · Singapore Dollar" }]} /></label>
              <label>Description <small>Optional</small><textarea name="description" maxLength={500} /></label>
              </FormDialog>
          </div>
        </div>

        <div className="event-admin-card-grid">
          {tickets.map((ticket) => (
            <div className="event-admin-mini-card" key={ticket.id}>
              <div className="event-admin-mini-top">
                <span className="event-admin-code">{ticket.code}</span>
                <PeopleRecordEditor eventId={eventId} kind="ticket" record={ticket}/>
              </div>
              <h3>{ticket.name}</h3>
              <p>{ticket.description || "No description provided."}</p>
              <div className="event-admin-mini-meta">
                <span>{ticket.capacity ?? "∞"} capacity</span>
                <strong>
                  {ticket.price > 0
                    ? `${ticket.currency} ${Number(ticket.price).toLocaleString("en-US")}`
                    : "Free"}
                </strong>
              </div>
            </div>
          ))}
          {!tickets.length && (
            <div className="event-admin-empty-card">
              <strong>No pass categories yet</strong>
              <span>Add the first pass category with “Add ticket type”.</span>
            </div>
          )}
        </div>

      </section>

      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head event-admin-section-head-wrap">
          <div>
            <span className="section-kicker">Attendees</span>
            <h2>Registration list</h2>
            <p>{attendees.length} attendees shown in the current results.</p>
          </div>
          <div className="event-admin-head-actions">
            <AvatarCircles
              people={attendees.slice(0, 3).map((attendee) => ({
                name: attendee.name,
                imageUrl: attendeePhoto.get(attendee.id) ?? null,
              }))}
              extra={Math.max(0, attendees.length - 3)}
            />
            <FormDialog trigger="Add attendee" title="Add attendee" description="Register someone manually. To add many at once, import a CSV." action={createAttendee} submitLabel="Add attendee">
                              <input type="hidden" name="eventId" value={eventId} />
                <label>Full name<input name="name" placeholder="Attendee full name" required maxLength={100} /></label>
                <label>Email<input name="email" type="email" placeholder="attendee@company.com" /></label>
                <label>Phone<input name="phone" type="tel" placeholder="+62 812 3456 7890" maxLength={40} /></label>
                <label>Pass category<SmartSelect name="ticketTypeId" value="" options={[{ value: "", label: "No pass type" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]} /></label>
                </FormDialog>
            <PopupPanel trigger="Import CSV" title="Import attendees" description="Upload a CSV with name, email, phone and pass category columns.">
              <CsvImportForm eventId={eventId} />
            </PopupPanel>
            <a className="button button-ghost" href={`/organizer/events/${eventId}/export/attendees`}>
              Export CSV
            </a>
          </div>
        </div>

        <form className="event-admin-search" method="get">
          <Search size={15} />
          <input name="q" defaultValue={search} placeholder="Search attendees" aria-label="Search attendees" />
          <button type="submit">Search</button>
        </form>
        <div className="event-admin-table-shell">
          <table className="event-admin-table people-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Pass</th>
                <th>Check-in</th>
                <th><span className="sr-only">Manage</span></th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr key={attendee.id}>
                  <td><code>{attendee.attendee_code}</code></td>
                  <td>
                    <div className="people-identity">
                      <span
                        className="people-avatar"
                        style={photos.get(attendee.id) ? { backgroundImage: `url("${photos.get(attendee.id)}")` } : undefined}
                      >
                        {!photos.get(attendee.id) && attendee.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <strong>{attendee.name}</strong>
                    </div>
                  </td>
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
          {!attendees.length && <div className="event-admin-table-empty">No attendees have registered yet.</div>}
        </div>


      </section>

      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Crew</span>
            <h2>Event team</h2>
            <p>Create limited event access for crew members and staff.</p>
          </div>
          <div className="event-admin-head-actions">
            <span className="event-admin-section-count">
              {crew.filter((member) => member.status === "active").length} active
            </span>
          <PopupPanel key={typeof query.invite === "string" ? query.invite : "invite"} trigger="Invite crew" title="Invite crew" description="Creates a 7-day link with limited access to this event.">
            <form action={createCrewInvitation}>
              <input type="hidden" name="eventId" value={eventId} />
              <label>Job title<input name="jobTitle" placeholder="Gate Operations" required maxLength={100} /></label>
              <label>Access<SmartSelect name="accessRole" value="crew" options={[{ value: "crew", label: "Crew" }, { value: "lead", label: "Lead" }, { value: "scanner", label: "Scanner" }]} /></label>
              <label>Email <small>Optional</small><input name="email" type="email" placeholder="crew@company.com" /></label>
              <div className="record-actions"><span/><button type="submit">Create invitation</button></div>
            </form>
          </PopupPanel>
          </div>
        </div>

        {typeof query.invite === "string" && (
          <div className="event-admin-invite-banner">
            <div>
              <strong>Invitation link created</strong>
              <code>
                {`${process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id"}/crew/join?token=${query.invite}`}
              </code>
              <span>This invitation link is valid for 7 days.</span>
            </div>
          </div>
        )}

        <div className="resource-manager">
          {crew.map((member) => (
            <div key={member.user_id} className="resource-record">
              <span><strong>{member.job_title}</strong><small>{member.access_role} · {member.status}</small></span>
              {member.status === "active" && (
                <form action={revokeCrew}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="userId" value={member.user_id} />
                  <button className="event-admin-danger-link" type="submit">Revoke</button>
                </form>
              )}
            </div>
          ))}
          {!crew.length && <p className="event-admin-table-empty">No crew yet. Invite someone to scan or run the desk.</p>}
        </div>
      </section>
    </>
  );
}
