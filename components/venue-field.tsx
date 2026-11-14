"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ExternalLink, LoaderCircle, MapPin, Search } from "lucide-react";

type PhotonFeature = {
  type: "Feature";
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  geometry?: { type: "Point"; coordinates: [number, number] };
};

type VenueSuggestion = {
  id: string;
  name: string;
  address: string;
  value: string;
  coordinates?: [number, number];
};

function normalizePart(value?: string) {
  return value?.trim() ?? "";
}

function toSuggestion(feature: PhotonFeature, index: number): VenueSuggestion | null {
  const p = feature.properties ?? {};
  const name = normalizePart(p.name);
  const street = [p.housenumber, p.street].map(normalizePart).filter(Boolean).join(" ");
  const locality = [p.locality, p.district, p.city, p.state, p.country]
    .map(normalizePart)
    .filter((part, i, all) => part && all.indexOf(part) === i);
  const addressParts = [street, ...locality].filter((part, i, all) => part && all.indexOf(part) === i);
  const address = addressParts.join(", ");
  const primary = name || address;
  if (!primary) return null;
  const value = [primary, address && address !== primary ? address : ""]
    .filter(Boolean)
    .join(", ")
    .slice(0, 160);
  return {
    id: `${p.name ?? primary}-${feature.geometry?.coordinates?.join(",") ?? index}`,
    name: primary,
    address,
    value,
    coordinates: feature.geometry?.coordinates,
  };
}

export function VenueField({ defaultValue = "", name = "venue" }: { defaultValue?: string | null; name?: string }) {
  const [venue, setVenue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<VenueSuggestion | null>(null);
  const [shouldSearch, setShouldSearch] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const listId = useId();

  useEffect(() => {
    const query = venue.trim();
    if (!shouldSearch || query.length < 3 || selected?.value === venue) return;

    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setMessage("");
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error("Location search unavailable");
        const data = (await response.json()) as { features?: PhotonFeature[] };
        if (currentRequest !== requestId.current) return;
        const next = (data.features ?? [])
          .map(toSuggestion)
          .filter((item): item is VenueSuggestion => Boolean(item));
        setSuggestions(next);
        setOpen(true);
        setActiveIndex(-1);
        setMessage(next.length ? "" : "No matching places. You can still use the location you typed.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (currentRequest === requestId.current) {
          setSuggestions([]);
          setOpen(true);
          setMessage("Place suggestions are unavailable right now. You can enter the location manually.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [venue, selected, shouldSearch]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const mapsQuery = selected?.coordinates
    ? `${selected.coordinates[1]},${selected.coordinates[0]}`
    : venue.trim();
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : "https://www.google.com/maps";

  function choose(suggestion: VenueSuggestion) {
    setVenue(suggestion.value);
    setSelected(suggestion);
    setShouldSearch(false);
    setSuggestions([]);
    setOpen(false);
    setMessage("");
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  }

  return (
    <div className="ui-field ui-span-2 venue-field" ref={rootRef}>
      <label htmlFor={listId}><span>Venue / location</span></label>
      <div className="venue-field-input-wrap">
        <Search size={16} aria-hidden="true" className="venue-field-search-icon" />
        <input
          id={listId}
          className="ui-input venue-field-input"
          name={name}
          maxLength={160}
          value={venue}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${listId}-suggestions`}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          onChange={(event) => {
            setVenue(event.target.value);
            setSelected(null);
            setShouldSearch(true);
            setSuggestions([]);
            setLoading(false);
            setMessage("");
            setOpen(event.target.value.trim().length >= 3);
          }}
          onFocus={() => { if (venue.trim().length >= 3 && (suggestions.length || message)) setOpen(true); }}
          onKeyDown={onInputKeyDown}
          placeholder="Search a venue, address, or landmark"
        />
        {loading && <LoaderCircle size={16} className="venue-field-spinner" aria-label="Searching places" />}
      </div>
      {open && (
        <div className="venue-suggestions" id={`${listId}-suggestions`} role="listbox" aria-label="Place suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              id={`${listId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className="venue-suggestion"
              key={suggestion.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(suggestion)}
            >
              <span className="venue-suggestion-icon"><MapPin size={17} /></span>
              <span className="venue-suggestion-copy">
                <strong>{suggestion.name}</strong>
                {suggestion.address && <small>{suggestion.address}</small>}
              </span>
              {selected?.id === suggestion.id && <Check size={16} />}
            </button>
          ))}
          {message && <p className="venue-suggestion-message">{message}</p>}
          <div className="venue-suggestion-footer">Place data © OpenStreetMap contributors · Photon</div>
        </div>
      )}
      <a className="ui-link" href={mapsUrl} target="_blank" rel="noreferrer">
        <MapPin size={14} /> Preview location on Google Maps <ExternalLink size={13} />
      </a>
      <small>Start typing to see suggestions. You can also enter a location manually.</small>
    </div>
  );
}
