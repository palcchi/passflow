"use client";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { importAttendees } from "@/app/admin/actions";
export function CsvImportForm({ eventId }: { eventId: string }) {
  const [text, setText] = useState("");
  const preview = useMemo(() => text.split(/\r?\n/).map(row => row.trim()).filter(Boolean).slice(0, 6), [text]);
  return <form action={importAttendees} className="mt-5 rounded-md border border-dashed border-border p-4">
    <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="rows" value={text} />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Import attendee</p><p className="mt-1 text-xs text-muted-foreground">CSV: nama,email,kode_tiket,telepon. Maksimal 500 baris.</p></div><label className="button button-ghost cursor-pointer"><Upload size={15} /> Pilih CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={async event => { const file = event.target.files?.[0]; if (file) setText(await file.text()); }} /></label></div>
    <textarea value={text} onChange={event => setText(event.target.value)} rows={3} className="mt-4 w-full rounded-md border border-input bg-background p-3 font-mono text-xs" placeholder="Vallian,vallian@example.com,VIP,0812..." />
    {preview.length > 0 && <div className="mt-3 overflow-x-auto rounded bg-muted p-3"><p className="mb-2 text-xs font-medium">Preview {text.split(/\r?\n/).filter(Boolean).length} baris</p><table className="min-w-full text-left text-xs"><tbody>{preview.map((row, index) => <tr key={index} className="border-b border-border last:border-0">{row.split(",").map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-1">{cell || "-"}</td>)}</tr>)}</tbody></table></div>}
    <button disabled={!text.trim()} className="button button-dark mt-3 disabled:opacity-50" type="submit">Import CSV</button>
  </form>;
}
