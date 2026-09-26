"use client";

import { Trash2 } from "lucide-react";
import { deleteFigmaDesign } from "@/app/admin/actions";

export function DeleteDesignForm({ eventId, designId, name }: { eventId: string; designId: string; name: string }) {
  return <form action={deleteFigmaDesign} onSubmit={(event) => {
    if (!window.confirm(`Hapus koneksi desain “${name}” dari event ini? File Figma aslimu tidak akan diubah.`)) event.preventDefault();
  }}>
    <input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="designId" value={designId}/>
    <button className="icon-button danger" type="submit" aria-label={`Hapus desain ${name}`}><Trash2 size={15}/></button>
  </form>;
}
