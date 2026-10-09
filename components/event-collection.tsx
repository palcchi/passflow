"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { EventClassCard } from "@/components/event-class-card";
import type { Registration } from "@/components/event-class-card";

export function EventCollection({ events, registrations = {}, manage = false }: {
  events: PassFlowEvent[]; registrations?: Record<string, Registration>; manage?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const tabs = manage
    ? [["all", "All"], ["published", "Live"], ["draft", "Draft"], ["archived", "Archived"]]
    : [["all", "All events"], ["joined", "Registered"]];
  const needle = query.trim().toLocaleLowerCase("id");
  const visible = events.filter((event) => {
    const matches = `${event.name} ${event.venue}`.toLocaleLowerCase("id").includes(needle);
    return matches && (filter === "all" || (filter === "joined" ? Boolean(registrations[event.id]) : event.status === filter));
  });
  const count = (key: string) => key === "all" ? events.length : key === "joined" ? events.filter((e) => registrations[e.id]).length : events.filter((e) => e.status === key).length;

  return <div>
    <div className="ui-toolbar">
      <div className="ui-segment" role="group" aria-label="Filter events">
        {tabs.filter(([key]) => key === "all" || count(key) > 0 || key === filter).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{count(key)}</span></button>
        ))}
      </div>
      <label className="ui-search">
        <Search size={16} />
        <span className="sr-only">Search events or venues</span>
        <input type="search" placeholder="Search events or venues" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
      </label>
    </div>
    {visible.length ? (
      manage
        ? <ul className="ui-list">{visible.map((event) => <li key={event.id}><EventClassCard event={event} manage /></li>)}</ul>
        : <div className="ui-eventgrid">{visible.map((event) => <EventClassCard key={event.id} event={event} registration={registrations[event.id]} />)}</div>
    ) : (
      <div className="ui-empty">
        <strong>{events.length ? "No events match." : manage ? "No events yet." : "Nothing published yet."}</strong>
        <p>{events.length ? "Try another search or show all events." : manage ? "Create an event to start taking registrations." : "New events show up here as soon as organizers publish them."}</p>
        {(query || filter !== "all") && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => { setQuery(""); setFilter("all"); }}>Show all events</button>}
      </div>
    )}
  </div>;
}
