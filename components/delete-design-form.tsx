"use client";

import { Trash2 } from "lucide-react";
import { deleteFigmaDesign } from "@/app/admin/actions";

export function DeleteDesignForm({ eventId, designId, name }: { eventId: string; designId: string; name: string }) {
  return <form action={deleteFigmaDesign} onSubmit={(event) => {
    if (!window.confirm(`Remove the “${name}” design connection from this event? Your original Figma file will not be modified.`)) event.preventDefault();
  }}>
    <input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="designId" value={designId}/>
    <button className="icon-button danger" type="submit" aria-label={`Remove design ${name}`}><Trash2 size={15}/></button>
  </form>;
}
