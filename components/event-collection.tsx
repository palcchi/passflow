"use client";

import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { EventClassCard } from "@/components/event-class-card";
import { FolderArtwork } from "@/components/flow-brand-art";

export function EventCollection({ events, registeredIds = [], manage = false }: {
  events: PassFlowEvent[]; registeredIds?: string[]; manage?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const tabs = manage ? [["all", "All events"], ["published", "Published"], ["draft", "Draft"]] : [["all", "All events"], ["joined", "Registered"]];
  const visible = events.filter(event => {
    const matches = `${event.name} ${event.venue}`.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"));
    return matches && (filter === "all" || (filter === "joined" ? registeredIds.includes(event.id) : event.status === filter));
  });
  return <div className="event-collection">
    <div className="collection-toolbar">
      <div className="collection-filters" role="group" aria-label="Filter event">{tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}{key === "all" && <span>{events.length}</span>}</button>)}</div>
      <label className="collection-search"><Search size={17}/><span className="sr-only">Search events or venues</span><input type="search" placeholder="Search events by name or venue" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={15}/></button>}</label>
    </div>
    <p className="collection-count" role="status">{visible.length} event{query ? ` matching “${query}”` : " in this collection"}</p>
    {visible.length ? <div className={manage ? "class-event-grid flow-event-list" : "class-event-grid"}>{visible.map(event => <EventClassCard flow key={event.id} event={event} manage={manage} joined={registeredIds.includes(event.id)}/>)}</div> : <div className="studio-empty-state"><FolderArtwork color="blue" label="Room for more"/><h3>{events.length ? "No matching events found." : "Your event collection starts here."}</h3><p>{events.length ? "Try another search term or reset the filters." : manage ? "Create your first event, configure the details, and invite your audience." : "Published events will appear here."}</p>{(query || filter !== "all") && <button className="button button-ghost" onClick={() => {setQuery(""); setFilter("all");}}><SlidersHorizontal size={15}/>Reset filter</button>}</div>}
  </div>;
}
