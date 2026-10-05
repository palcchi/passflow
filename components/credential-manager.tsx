"use client";
import { useState, useTransition } from "react";
import { manageCredentials } from "@/app/admin/actions";

type Credential = { id: string; display_code: string | null; status: string; claimed_at: string | null; revoked_at: string | null; owner: string | null };
const PAGE = 24;

// Search, filter and select QR codes; revoke any live code, delete codes nobody has claimed.
export function CredentialManager({ eventId, credentials }: { eventId: string; credentials: Credential[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const q = query.trim().toLowerCase();
  const filtered = credentials.filter(c => (status === "all" || c.status === status) && (!q || `${c.display_code ?? ""} ${c.owner ?? ""}`.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, (current + 1) * PAGE);
  const chosen = credentials.filter(c => selected.has(c.id));
  const revocable = chosen.filter(c => c.status === "active" || c.status === "unclaimed");
  const deletable = chosen.filter(c => c.status === "unclaimed");
  const allOnPage = rows.length > 0 && rows.every(c => selected.has(c.id));

  function toggle(ids: string[], on: boolean) {
    setSelected(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next; });
  }
  function run(operation: "revoke" | "delete", items: Credential[]) {
    if (!items.length) return;
    const what = items.length === 1 ? items[0].display_code ?? "this QR" : `${items.length} QR codes`;
    if (!window.confirm(operation === "delete" ? `Delete ${what}? Printed copies stop working and the code is gone for good.` : `Revoke ${what}? It stops opening any gate. This cannot be undone.`)) return;
    const form = new FormData();
    form.set("eventId", eventId); form.set("operation", operation);
    items.forEach(c => form.append("credentialId", c.id));
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await manageCredentials(form);
        setMessage({ text: result.error ?? result.message ?? "Done.", error: Boolean(result.error) });
        if (!result.error) toggle(items.map(c => c.id), false);
      } catch { setMessage({ text: "Connection interrupted. Try again.", error: true }); }
    });
  }

  if (!credentials.length) return <div className="event-admin-empty-card"><strong>No QR codes yet</strong><span>Generate a batch for printed wristbands or cards. In automatic mode PassFlow creates one per registration.</span></div>;
  return <div className="credential-manager">
    <div className="resource-toolbar">
      <input className="event-admin-input" aria-label="Search QR codes" placeholder="Search code or attendee…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }}/>
      <select className="event-admin-input" aria-label="Filter by status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
        <option value="all">All statuses</option><option value="unclaimed">Unclaimed</option><option value="active">Active</option><option value="revoked">Revoked</option><option value="replaced">Replaced</option>
      </select>
    </div>
    {chosen.length > 0 && <div className="credential-bulk" role="toolbar" aria-label="Selected QR codes">
      <strong>{chosen.length} selected</strong>
      <button type="button" className="button button-ghost" disabled={pending || !revocable.length} onClick={() => run("revoke", revocable)}>Revoke{revocable.length !== chosen.length && revocable.length ? ` ${revocable.length}` : ""}</button>
      <button type="button" className="button button-ghost record-danger" disabled={pending || !deletable.length} onClick={() => run("delete", deletable)}>Delete{deletable.length !== chosen.length && deletable.length ? ` ${deletable.length}` : ""}</button>
      <button type="button" className="event-admin-text-action" onClick={() => setSelected(new Set())}>Clear</button>
    </div>}
    {message && <p role={message.error ? "alert" : "status"} className="studio-notice">{message.text}</p>}
    <table className="credential-table">
      <thead><tr>
        <th><input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={e => toggle(rows.map(c => c.id), e.target.checked)}/></th>
        <th>Code</th><th>Status</th><th>Attendee</th><th><span className="sr-only">Actions</span></th>
      </tr></thead>
      <tbody>{rows.map(c => <tr key={c.id} data-selected={selected.has(c.id)}>
        <td><input type="checkbox" aria-label={`Select ${c.display_code ?? "QR"}`} checked={selected.has(c.id)} onChange={e => toggle([c.id], e.target.checked)}/></td>
        <td><strong>{c.display_code ?? "QR"}</strong></td>
        <td><span className={`event-admin-state ${c.status === "active" ? "is-success" : ""}`}>{c.status}</span></td>
        <td>{c.owner ?? <small>Not claimed</small>}</td>
        <td className="credential-actions">
          {(c.status === "active" || c.status === "unclaimed") && <button type="button" className="event-admin-text-action" disabled={pending} onClick={() => run("revoke", [c])}>Revoke</button>}
          {c.status === "unclaimed" && <button type="button" className="event-admin-text-action record-danger" disabled={pending} onClick={() => run("delete", [c])}>Delete</button>}
        </td>
      </tr>)}</tbody>
    </table>
    {!rows.length && <p className="event-admin-table-empty">No matching QR codes.</p>}
    {pages > 1 && <div className="resource-toolbar resource-pager"><button type="button" className="button button-ghost" disabled={!current} onClick={() => setPage(current - 1)}>Previous</button><span>{current + 1} / {pages} · {filtered.length} codes</span><button type="button" className="button button-ghost" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Next</button></div>}
  </div>;
}
