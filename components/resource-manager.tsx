"use client";

import { useState, useTransition } from "react";
import { FormDialog } from "@/components/form-dialog";
import Link from "next/link";
import { X } from "lucide-react";
import { manageEventResource } from "@/app/organizer/events/resource-actions";

type Resource = { id: string; name: string; code?: string; description?: string | null; is_active?: boolean; mode?: string; zone_id?: string | null; config?: unknown };
type Props = { eventId: string; kind: "station" | "zone" | "activity" | "benefit"; records: Resource[]; zones?: { id: string; name: string }[] };
export function ResourceManager({ eventId, kind, records, zones = [] }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = records.filter(r => `${r.name} ${r.code ?? ""} ${r.mode ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || (status === "active") === r.is_active));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages - 1);
  return <div className="ui-resources">
    {records.length > 5 && <div className="ui-resource-tools">
      <input className="ui-input" aria-label={`Search ${kind}s`} placeholder={`Search ${kind === "station" ? "gates" : `${kind}s`}…`} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
      {records.some(r => r.is_active !== undefined) && <select className="ui-select" aria-label="Filter status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>}
    </div>}
    {filtered.slice(current * 10, (current + 1) * 10).map(r => <ResourceEditor key={r.id} eventId={eventId} kind={kind} record={r} zones={zones} />)}
    {!filtered.length && <p className="ui-small ui-panel-empty">{records.length ? "No matching records." : "Nothing here yet."}</p>}
    {pages > 1 && <div className="ui-pager"><button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={!current} onClick={() => setPage(current - 1)}>Previous</button><span>{current + 1} / {pages} · {filtered.length} records</span><button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Next</button></div>}
  </div>;
}
function ResourceEditor({ eventId, kind, record: r, zones }: Omit<Props, "records"> & { record: Resource }) {
  const config = r.config && typeof r.config === "object" ? r.config as Record<string, unknown> : {};
  async function action(form: FormData) {
    if (form.get("operation") === "delete") {
      if (!window.confirm(`Delete “${r.name}”? Records with dependencies or history cannot be deleted.`)) return { keepOpen: true };
      form.set("confirmation", "yes");
    }
    return manageEventResource(form);
  }
  return <div className="ui-resource">
    <span className="ui-listrow-main"><strong>{r.name}</strong><small>{kind === "station" ? <Link className="ui-link ui-link-sm" href={`/scan/${r.id}`}>Open scanner</Link> : <span className="ui-mono">{r.code}</span>}</small></span>
    {r.is_active !== undefined && <span className={r.is_active ? "ui-badge ui-badge-success" : "ui-badge"}>{r.is_active ? "Active" : "Paused"}</span>}
    <FormDialog trigger="Manage" triggerClassName="record-edit-button" title={`Manage ${r.name}`} description={r.code ? `Code ${r.code} stays fixed to keep station links and history.` : undefined} action={action} submitLabel="Save changes"
      secondary={<>
        <button formNoValidate className="record-danger" name="operation" value="delete">Delete</button>
        {r.is_active !== undefined && <button formNoValidate name="operation" value={r.is_active ? "deactivate" : "activate"}>{r.is_active ? "Deactivate" : "Activate"}</button>}
      </>}>
      <input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="id" value={r.id}/><input type="hidden" name="kind" value={kind}/>
      <label>Name<input name="name" defaultValue={r.name} maxLength={100} required /></label>
      {kind !== "station" && <label>Description<textarea name="description" defaultValue={r.description ?? ""} maxLength={500}/></label>}
      {kind === "station" && <>
        <label>Scanner mode<select name="mode" defaultValue={r.mode}><option value="check_in">Check-in</option><option value="zone_access">Zone access</option><option value="activity">Activity</option><option value="claim">Benefit claim</option></select></label>
        <label>Access zone<select name="zone_id" defaultValue={r.zone_id ?? ""}><option value="">No zone</option>{zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label>Activity code<input name="activity_code" defaultValue={String(config.activity_code ?? "")}/></label>
        <label>Benefit code<input name="benefit_code" defaultValue={String(config.benefit_code ?? "")}/></label>
      </>}
    </FormDialog>
  </div>;
}

export function DeleteAccessRule({eventId,id}:{eventId:string;id:string}) {
  const [pending,startTransition]=useTransition();const [error,setError]=useState('');
  return <div><button type="button" className="ui-iconbtn ui-iconbtn-sm" aria-label="Remove rule" title="Remove rule" disabled={pending} onClick={()=>{
    if(!window.confirm('Remove this access rule? Without an allow rule, zone access is denied.'))return;
    const form=new FormData();Object.entries({eventId,id,kind:'rule',operation:'delete',confirmation:'yes'}).forEach(([key,value])=>form.set(key,value));
    startTransition(async()=>{try{const result=await manageEventResource(form);setError(result.error??'');}catch{setError('The rule could not be removed. Try again.');}});
  }}><X size={14}/></button>{error&&<p role="alert">{error}</p>}</div>;
}
