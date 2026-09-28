"use client";

import { type FormEvent, useState } from "react";
import { Search } from "lucide-react";

type Attendee = {
  id: string;
  name: string;
  attendee_code: string;
  ticket_type: string | null;
  checked_in: boolean;
};

function failure(status: number, reason?: string) {
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "You do not have access to this station.";
  if (status === 429 || reason === "rate_limited") return "Too many attempts. Wait a moment and retry.";
  return "Lookup is unavailable. Check the connection and retry.";
}

export function ManualCheckIn({ stationId, open, onOpenChange }: {
  stationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selected, setSelected] = useState<Attendee | null>(null);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [searched, setSearched] = useState(false);

  async function request(body: Record<string, string>) {
    let response: Response;
    try {
      response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ station: stationId, ...body }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new Error("Connection interrupted or timed out. Reconnect and retry.");
    }
    let data;
    try { data = await response.json(); } catch { throw new Error("Validation is unavailable. Retry shortly."); }
    if (!response.ok || !data?.ok) throw new Error(failure(response.status, data?.reason));
    return data;
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2 || loading) return;
    setLoading(true); setError(""); setResult(""); setSelected(null); setSearched(false);
    try {
      const data = await request({ action: "lookup", query: query.trim() });
      setAttendees(Array.isArray(data.attendees) ? data.attendees : []);
      setSearched(true);
    } catch (cause) {
      setAttendees([]);
      setError(cause instanceof Error ? cause.message : "Lookup failed. Retry.");
    } finally { setLoading(false); }
  }

  async function checkIn() {
    if (!selected || !verified || reason.trim().length < 8 || loading) return;
    setLoading(true); setError(""); setResult("");
    try {
      const data = await request({ action: "manual", attendeeId: selected.id, reason: reason.trim() });
      setResult(data.message ?? "Check-in recorded.");
      if (data.decision === "granted") {
        setAttendees(items => items.map(item => item.id === selected.id ? { ...item, checked_in: true } : item));
      }
      setVerified(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check-in failed. Retry.");
    } finally { setLoading(false); }
  }

  return <section className="camera-manual">
    <button type="button" className="camera-manual-toggle" onClick={() => onOpenChange(!open)} aria-expanded={open}>
      <Search size={17}/> Camera unavailable? Look up an attendee
    </button>
    {open && <div className="camera-manual-content">
      <p>Search by name or attendee code. Verify their identity before recording a manual check-in.</p>
      <form onSubmit={search}>
        <label htmlFor="manual-attendee-query">Attendee name or code</label>
        <div className="camera-manual-search">
          <input id="manual-attendee-query" value={query} maxLength={80} minLength={2}
            onChange={event => { setQuery(event.target.value); setAttendees([]); setSelected(null); setResult(""); setSearched(false); }}
            placeholder="Enter at least 2 characters" required />
          <button type="submit" disabled={loading || query.trim().length < 2}>Search</button>
        </div>
      </form>
      {attendees.length > 0 && <div className="camera-manual-results" aria-label="Matching attendees">
        {attendees.map(attendee => <button type="button" key={attendee.id}
          className={selected?.id === attendee.id ? "is-selected" : ""}
          onClick={() => { setSelected(attendee); setVerified(false); setReason(""); setResult(""); }}>
          <strong>{attendee.name}</strong>
          <span>{attendee.attendee_code} · {attendee.ticket_type ?? "No category"} · {attendee.checked_in ? "Checked in" : "Not checked in"}</span>
        </button>)}
      </div>}
      {searched && attendees.length === 0 && <p>No matching attendee in this event.</p>}
      {selected && <div className="camera-manual-confirm">
        <strong>Manual check-in for {selected.name}</strong>
        <label htmlFor="manual-reason">Reason for manual entry</label>
        <input id="manual-reason" value={reason} maxLength={200}
          onChange={event => setReason(event.target.value)}
          placeholder="e.g. Camera unavailable at main gate" />
        <label className="camera-manual-verified">
          <input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />
          <span>I verified this attendee’s identity.</span>
        </label>
        <button type="button" onClick={checkIn} disabled={loading || !verified || reason.trim().length < 8}>
          {loading ? "Recording…" : "Record manual check-in"}
        </button>
      </div>}
      {error && <p role="alert" className="camera-feedback">{error}</p>}
      {result && <p role="status" className="camera-manual-result">{result}</p>}
    </div>}
  </section>;
}
