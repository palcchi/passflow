import {
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Ticket,
  UserRoundCheck,
} from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { PeopleRecordEditor } from "@/components/people-record-editor";

type AttendeeProfile = {
  id: string;
  attendee_code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  ticket_type_id?: string | null;
  checked_in_at?: string | null;
  user_id?: string | null;
};

type TicketOption = {
  id: string;
  name: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function PersonProfileCard({
  eventId,
  attendee,
  ticketName,
  tickets,
}: {
  eventId: string;
  attendee: AttendeeProfile;
  ticketName?: string | null;
  tickets: TicketOption[];
}) {
  const checkedIn = Boolean(attendee.checked_in_at);

  return (
    <MagicCard className="person-profile-card">
      <div className="person-profile-top">
        <span className="person-profile-avatar" aria-hidden="true">
          {initials(attendee.name)}
        </span>
        <div className="person-profile-heading">
          <strong>{attendee.name}</strong>
          <span>{attendee.email || "No email provided"}</span>
        </div>
        {attendee.user_id && (
          <span className="person-profile-linked" title="Linked PassFlow account">
            <UserRoundCheck size={13} />
            Profile
          </span>
        )}
      </div>

      <div className="person-profile-details">
        <div>
          <Mail size={14} />
          <span>{attendee.email || "No email"}</span>
        </div>
        <div>
          <Phone size={14} />
          <span>{attendee.phone || "No phone number"}</span>
        </div>
        <div>
          <Ticket size={14} />
          <span>{ticketName || "No pass assigned"}</span>
        </div>
      </div>

      <div className="person-profile-tags">
        <span className="person-profile-code">{attendee.attendee_code}</span>
        <span className={`person-profile-state ${checkedIn ? "is-checked" : ""}`}>
          {checkedIn ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
          {checkedIn ? "Checked in" : "Pending"}
        </span>
      </div>

      <div className="person-profile-footer">
        <span>
          {attendee.user_id
            ? "Linked to a PassFlow account"
            : "Event-only attendee"}
        </span>
        <PeopleRecordEditor
          eventId={eventId}
          kind="attendee"
          record={attendee}
          tickets={tickets}
        />
      </div>
    </MagicCard>
  );
}
