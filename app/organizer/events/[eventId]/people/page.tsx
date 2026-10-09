import { attendeePhotoColumns, attendeePhotoUrls } from "@/lib/attendee-photos";
import { Search } from "lucide-react";
import { PeopleRecordEditor } from "@/components/people-record-editor";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { CsvImportForm } from "@/components/csv-import-form";
import { FormDialog, PopupPanel } from "@/components/form-dialog";
import { FormattedNumberInput, SmartSelect } from "@/components/form-fields";
import { reviewRegistration } from "@/app/organizer/events/people-actions";
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
    .select("id, attendee_code, name, email, phone, checked_in_at, ticket_type_id, user_id, approval_status")
    .eq("event_id", eventId)
    .neq("approval_status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    attendeeQuery = attendeeQuery.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,attendee_code.ilike.%${search}%`,
    );
  }

  const [ticketsResult, attendeesResult, crewResult, pendingResult] = await Promise.all([
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
    supabase
      .from("attendees")
      .select("id, name, email, phone, ticket_type_id, created_at")
      .eq("event_id", eventId)
      .eq("approval_status", "pending")
      .order("created_at")
      .limit(200),
  ]);
  const pending = pendingResult.data ?? [];

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id";
  const activeCrew = crew.filter((member) => member.status === "active").length;

  return (
    <>
      {pending.length > 0 && (
        <section className="ui-card ui-approvals" aria-labelledby="approval-title">
          <div className="ui-sectionhead">
            <div>
              <h2 id="approval-title" className="ui-h2">{pending.length} waiting for approval</h2>
              <p>Approving issues their QR pass and sends an email and a notification. Declined guests are told by email.</p>
            </div>
          </div>
          <ul className="ui-divide ui-plain">
            {pending.map((person) => (
              <li key={person.id} className="ui-approval">
                <span className="ui-listrow-main">
                  <strong>{person.name}</strong>
                  <small>{[person.email, person.phone, person.ticket_type_id ? ticketName.get(person.ticket_type_id) : null].filter(Boolean).join(" · ")}</small>
                </span>
                <form action={reviewRegistration} className="ui-row">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="attendeeId" value={person.id} />
                  <button type="submit" name="decision" value="decline" className="ui-btn ui-btn-ghost ui-btn-sm">Decline</button>
                  <button type="submit" name="decision" value="approve" className="ui-btn ui-btn-primary ui-btn-sm">Approve</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={pending.length ? "ui-section" : undefined} aria-labelledby="passes-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="passes-title" className="ui-h2">Pass categories</h2>
            <p>What people can register for. Access rules and Figma pass designs can target each one.</p>
          </div>
          <FormDialog trigger="Add category" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add pass category" description="A pass category attendees can register for. Access rules and Figma pass designs can target it." action={createTicketType} submitLabel="Add category">
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
        {tickets.length ? (
          <div className="ui-grid ui-grid-3">
            {tickets.map((ticket) => (
              <article className="ui-card ui-passcat" key={ticket.id}>
                <div className="ui-row"><span className="ui-badge ui-mono">{ticket.code}</span><span className="ui-spacer" /><PeopleRecordEditor eventId={eventId} kind="ticket" record={ticket} /></div>
                <h3 className="ui-h3">{ticket.name}</h3>
                <p className="ui-small">{ticket.description || "No description."}</p>
                <div className="ui-passcat-foot">
                  <span>{ticket.capacity ? `${ticket.capacity.toLocaleString("en-US")} spots` : "Unlimited"}</span>
                  <strong>{ticket.price > 0 ? `${ticket.currency} ${Number(ticket.price).toLocaleString("en-US")}` : "Free"}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ui-empty"><strong>No pass categories yet</strong><p>Add at least one category before you publish. Attendees choose it when they register.</p></div>
        )}
      </section>

      <section className="ui-section" aria-labelledby="attendees-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="attendees-title" className="ui-h2">Attendees</h2>
            <p>{search ? `${attendees.length} matching "${search}"` : `${attendees.length.toLocaleString("en-US")} registered`}</p>
          </div>
          <div className="ui-row">
            <a className="ui-btn ui-btn-ghost ui-btn-sm" href={`/organizer/events/${eventId}/export/attendees`}>Export CSV</a>
            <PopupPanel trigger="Import CSV" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Import attendees" description="Upload a CSV with name, email, phone and pass category columns.">
              <CsvImportForm eventId={eventId} />
            </PopupPanel>
            <FormDialog trigger="Add attendee" triggerClassName="ui-btn ui-btn-primary ui-btn-sm" title="Add attendee" description="Register someone manually. To add many at once, import a CSV." action={createAttendee} submitLabel="Add attendee">
              <input type="hidden" name="eventId" value={eventId} />
              <label>Full name<input name="name" placeholder="Attendee full name" required maxLength={100} /></label>
              <label>Email<input name="email" type="email" placeholder="attendee@company.com" /></label>
              <label>Phone<input name="phone" type="tel" placeholder="+62 812 3456 7890" maxLength={40} /></label>
              <label>Pass category<SmartSelect name="ticketTypeId" value="" options={[{ value: "", label: "No pass type" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]} /></label>
            </FormDialog>
          </div>
        </div>
        <form className="ui-search ui-search-wide" method="get" role="search">
          <Search size={16} />
          <input name="q" defaultValue={search} placeholder="Search by name, email or code" aria-label="Search attendees" />
        </form>
        {attendees.length ? (
          <div className="ui-tablewrap">
            <table className="ui-table people-table">
              <thead><tr><th>Name</th><th>Email</th><th>Pass</th><th>Check-in</th><th className="ui-end"><span className="sr-only">Manage</span></th></tr></thead>
              <tbody>
                {attendees.map((attendee) => (
                  <tr key={attendee.id}>
                    <td>
                      <div className="ui-person">
                        <span className="ui-avatar" style={attendeePhoto.get(attendee.id) ? { backgroundImage: `url("${attendeePhoto.get(attendee.id)}")` } : undefined}>{!attendeePhoto.get(attendee.id) && attendee.name.trim().charAt(0).toUpperCase()}</span>
                        <span><strong>{attendee.name}</strong><small className="ui-mono">{attendee.attendee_code}</small></span>
                      </div>
                    </td>
                    <td>{attendee.email ?? <span className="ui-muted">No email</span>}</td>
                    <td>{attendee.ticket_type_id ? ticketName.get(attendee.ticket_type_id) ?? "None" : "None"}</td>
                    <td>{attendee.approval_status === "rejected" ? <span className="ui-badge ui-badge-danger">Declined</span> : attendee.checked_in_at ? <span className="ui-badge ui-badge-success">Checked in</span> : <span className="ui-badge">Not yet</span>}</td>
                    <td className="ui-end"><PeopleRecordEditor eventId={eventId} kind="attendee" record={attendee} tickets={tickets} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ui-empty"><strong>{search ? "No one matches that search" : "No attendees yet"}</strong><p>{search ? "Check the spelling or search by attendee code." : "Share your event page, add people by hand or import a CSV."}</p></div>
        )}
      </section>

      <section className="ui-section" aria-labelledby="crew-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="crew-title" className="ui-h2">Crew</h2>
            <p>{activeCrew ? `${activeCrew} active. ` : ""}Crew get limited access to scan and check people in.</p>
          </div>
          <PopupPanel key={typeof query.invite === "string" ? query.invite : "invite"} trigger="Invite crew" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Invite crew" description="Creates a 7-day link with limited access to this event.">
            <form action={createCrewInvitation}>
              <input type="hidden" name="eventId" value={eventId} />
              <label>Job title<input name="jobTitle" placeholder="Gate Operations" required maxLength={100} /></label>
              <label>Access<SmartSelect name="accessRole" value="crew" options={[{ value: "crew", label: "Crew" }, { value: "lead", label: "Lead" }, { value: "scanner", label: "Scanner" }]} /></label>
              <label>Email <small>Optional</small><input name="email" type="email" placeholder="crew@company.com" /></label>
              <div className="record-actions"><span /><button type="submit">Create invitation</button></div>
            </form>
          </PopupPanel>
        </div>
        {typeof query.invite === "string" && (
          <div className="ui-notice ui-notice-success ui-invite">
            <strong>Invitation link created. It works for 7 days.</strong>
            <code className="ui-mono">{`${appUrl}/crew/join?token=${query.invite}`}</code>
          </div>
        )}
        {crew.length ? (
          <ul className="ui-list">
            {crew.map((member) => (
              <li key={member.user_id} className="ui-listrow">
                <span className="ui-listrow-main"><strong>{member.job_title}</strong><small className="capitalize">{member.access_role}</small></span>
                <span className="ui-listrow-end">
                  <span className={member.status === "active" ? "ui-badge ui-badge-success" : "ui-badge"}>{member.status === "active" ? "Active" : member.status === "invited" ? "Invited" : "Revoked"}</span>
                  {member.status === "active" && (
                    <form action={revokeCrew}>
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="userId" value={member.user_id} />
                      <button className="ui-btn ui-btn-ghost ui-btn-sm ui-text-danger" type="submit">Revoke</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ui-empty"><strong>No crew yet</strong><p>Invite the people running your doors so they can scan passes from their phones.</p></div>
        )}
      </section>
    </>
  );
}
