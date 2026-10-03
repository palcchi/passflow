// Minimal RFC 5545 single-event calendar file for "Add to calendar".
const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function icsEvent(e: { uid: string; title: string; start: string; end: string; location?: string; description?: string; url?: string }) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PassFlow//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@passflow`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description.slice(0, 1000))}` : "",
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}
