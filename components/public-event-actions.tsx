"use client";

import { CalendarPlus, ExternalLink, MapPin } from "lucide-react";

export function PublicEventActions({ slug, venue, eventSubdomain = false }: { slug: string; venue?: string | null; eventSubdomain?: boolean }) {
  const mapsUrl = venue?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.trim())}`
    : null;
  return (
    <nav className="public-event-actions" aria-label="Event links">
      <a href={eventSubdomain ? "/calendar" : `/e/${encodeURIComponent(slug)}/calendar`} className="public-event-action">
        <CalendarPlus size={17} />
        <span>Add to calendar</span>
        <ExternalLink size={13} />
      </a>
      {mapsUrl && (
        <a href={eventSubdomain ? "/location" : mapsUrl} className="public-event-action" target={eventSubdomain ? undefined : "_blank"} rel={eventSubdomain ? undefined : "noopener noreferrer"}>
          <MapPin size={17} />
          <span>Open location in Google Maps</span>
          <ExternalLink size={13} />
        </a>
      )}
    </nav>
  );
}
