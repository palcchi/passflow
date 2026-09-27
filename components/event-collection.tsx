"use client";

import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { EventClassCard } from "@/components/event-class-card";
import { FolderArtwork } from "@/components/brand-art";

export function EventCollection({ events, registeredIds = [], manage = false }: {
  events: PassFlowEvent[]; registeredIds?: string[]; manage?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const tabs = manage ? [["all", "Semua event"], ["published", "Published"], ["draft", "Draft"]] : [["all", "Semua event"], ["joined", "Terdaftar"]];
  const visible = events.filter(event => {
    const matches = `${event.name} ${event.venue}`.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"));
    return matches && (filter === "all" || (filter === "joined" ? registeredIds.includes(event.id) : event.status === filter));
  });
  return <div className="event-collection">
    <div className="collection-toolbar">
      <div className="collection-filters" role="group" aria-label="Filter event">{tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}{key === "all" && <span>{events.length}</span>}</button>)}</div>
      <label className="collection-search"><Search size={17}/><span className="sr-only">Cari event atau lokasi</span><input type="search" placeholder="Cari event atau lokasi…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery("")}><X size={15}/></button>}</label>
    </div>
    <p className="collection-count" role="status">{visible.length} event{query ? ` untuk “${query}”` : " dalam koleksi ini"}</p>
    {visible.length ? <div className="class-event-grid">{visible.map(event => <EventClassCard key={event.id} event={event} manage={manage} joined={registeredIds.includes(event.id)}/>)}</div> : <div className="studio-empty-state"><FolderArtwork color="blue" label="Room for more"/><h3>{events.length ? "Belum ketemu yang cocok." : "Cerita baru mulai di sini."}</h3><p>{events.length ? "Coba kata kunci lain atau tampilkan semua event." : manage ? "Buat event pertamamu. Atur detailnya, lalu ajak orang-orang bergabung." : "Event akan tampil di sini setelah dipublikasikan."}</p>{(query || filter !== "all") && <button className="button button-ghost" onClick={() => {setQuery(""); setFilter("all");}}><SlidersHorizontal size={15}/>Reset filter</button>}</div>}
  </div>;
}
