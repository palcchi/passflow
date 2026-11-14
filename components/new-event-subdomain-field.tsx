"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";
import { checkNewEventSubdomain, eventSubdomain } from "@/app/organizer/events/subdomain-actions";
import { eventRootDomain } from "@/lib/event-host";

export function NewEventSubdomainField({ initialValue = "", eventId }: { initialValue?: string; eventId?: string }) {
  const [label, setLabel] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [available, setAvailable] = useState(false);
  const [checkedLabel, setCheckedLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function check() {
    setAvailable(false);
    setMessage("");
    startTransition(async () => {
      try {
        const result = eventId ? await eventSubdomain(eventId, label, false) : await checkNewEventSubdomain(label);
        if (result.success) {
          setAvailable(true);
          setCheckedLabel(result.label ?? label.trim().toLowerCase());
          setLabel(result.label ?? label.trim().toLowerCase());
          setMessage("Available — you can use this event address.");
        } else {
          setMessage(result.error ?? "Could not check this address.");
        }
      } catch {
        setMessage("Could not check availability. Try again.");
      }
    });
  }

  return <div className="ui-field ui-span-2">
    <span>Event subdomain</span>
    <div className="ui-input-wrap">
      <div className="ui-row ui-address">
        <label className="ui-affix">
          <span className="sr-only">Event subdomain</span>
          <input className="ui-input" name="subdomain" required minLength={3} maxLength={63}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" value={label}
            onChange={e => { setLabel(e.target.value.toLowerCase()); setAvailable(false); setCheckedLabel(""); setMessage(""); }}
            placeholder="jakarta-design-week" />
          <span>.{eventRootDomain}</span>
        </label>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={check} disabled={pending || label.trim().length < 3}>
          {pending ? <LoaderCircle size={15} className="animate-spin" /> : available && checkedLabel === label ? <Check size={15} /> : <Search size={15} />}
          {pending ? "Checking…" : "Check availability"}
        </button>
      </div>
      <small>Event link: https://your-subdomain.{eventRootDomain}. Check availability before creating the event.</small>
      {message && <p role="status" className={available ? "ui-notice" : "ui-notice ui-notice-danger"}>{message}</p>}
    </div>
  </div>;
}
