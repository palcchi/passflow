"use client";
import { useState, useTransition } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { managePersonRecord } from "@/app/organizer/events/people-actions";
import { FormattedNumberInput, SmartSelect } from "@/components/form-fields";

type RecordData = { id: string; name: string; email?: string | null; phone?: string | null; ticket_type_id?: string | null; description?: string | null; price?: number; capacity?: number | null };
export function PeopleRecordEditor({ eventId, kind, record, tickets = [] }: {
  eventId: string; kind: "attendee" | "ticket"; record: RecordData; tickets?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(form: FormData) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await managePersonRecord(form);
        if (result.error) setMessage(result.error);
        else { setOpen(false); router.refresh(); }
      } catch { setMessage("Changes could not be saved. Check your connection and try again."); }
    });
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!pending) { setOpen(value); setDeleting(false); setMessage(""); } }}>
    <Dialog.Trigger className="record-edit-button">Manage</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="record-overlay"/><Dialog.Content className="record-dialog">
      <Dialog.Title>{deleting ? "Delete this record?" : kind === "attendee" ? "Edit attendee" : "Edit pass category"}</Dialog.Title>
      <Dialog.Description>{deleting ? kind === "attendee" ? "Their QR pass will be revoked immediately. All attendee data will be permanently deleted after 7 days." : "A category can only be deleted when it is not used by attendees, access rules, or designs." : record.name}</Dialog.Description>
      <Dialog.Close className="record-close" disabled={pending} aria-label="Close"><X size={20}/></Dialog.Close>
      <form action={submit}>
        <input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="id" value={record.id}/>
        <input type="hidden" name="kind" value={kind}/><input type="hidden" name="operation" value={deleting ? "delete" : "update"}/>
        {deleting ? <label className="record-confirm"><input type="checkbox" required name="confirmation" value="yes"/> I understand and want to delete {record.name}.</label> : <>
          <label>Name<input name="name" defaultValue={record.name} required maxLength={100}/></label>
          {kind === "attendee" ? <>
            <label>Email<input name="email" type="email" defaultValue={record.email ?? ""}/></label>
            <label>Phone<input name="phone" type="tel" inputMode="tel" defaultValue={record.phone ?? ""} maxLength={40}/></label>
            <label>Pass category<SmartSelect name="ticketTypeId" value={record.ticket_type_id ?? ""} options={[{ value: "", label: "No category" }, ...tickets.map(ticket => ({ value: ticket.id, label: ticket.name }))]}/></label>
          </> : <>
            <label>Description<textarea name="description" defaultValue={record.description ?? ""} maxLength={500}/></label>
            <label>Capacity (leave blank for unlimited)<FormattedNumberInput name="capacity" defaultValue={record.capacity ?? undefined} min={0}/></label>
            <label>Price<input name="price" inputMode="decimal" defaultValue={(record.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} required onBlur={event => {
              const value = event.target.value.trim();
              if (/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) event.target.value = Number(value.replace(/,/g, "")).toLocaleString("en-US", { maximumFractionDigits: 2 });
            }}/></label>
          </>}
        </>}
        {message && <p role="alert" className="camera-feedback">{message}</p>}
        <div className="record-actions">
          <button type="button" disabled={pending} onClick={() => { setDeleting(!deleting); setMessage(""); }}>{deleting ? "Back" : "Delete record"}</button>
          <button type="submit" disabled={pending}>{pending ? "Processing…" : deleting ? "Yes, delete" : "Save changes"}</button>
        </div>
      </form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
