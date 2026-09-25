export type EventTheme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  surface: string;
};

export type PassFlowEvent = {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  venue: string;
  dateLabel: string;
  attendeeCount: number;
  checkedInCount: number;
  theme: EventTheme;
};

export const demoEvents: PassFlowEvent[] = [
  {
    id: "evt_discoveries_2026",
    name: "Discoveries 2026",
    slug: "discoveries-2026",
    eyebrow: "Campus Festival",
    description:
      "A multi-zone festival experience with workshops, exhibitions, live sessions, and QR-based access.",
    venue: "Main Campus Hall",
    dateLabel: "12 October 2026",
    attendeeCount: 428,
    checkedInCount: 286,
    theme: {
      primary: "#7b1734",
      secondary: "#f0b8c6",
      background: "#fff8f9",
      foreground: "#211216",
      surface: "#ffffff",
    },
  },
  {
    id: "evt_nightshift_2026",
    name: "Night Shift Sessions",
    slug: "night-shift-sessions",
    eyebrow: "Music & Creative Night",
    description:
      "An evening event with stage access, creator rooms, merchandise claims, and live visitor tracking.",
    venue: "Warehouse 07",
    dateLabel: "24 October 2026",
    attendeeCount: 260,
    checkedInCount: 112,
    theme: {
      primary: "#5b5df0",
      secondary: "#b8b9ff",
      background: "#0f1014",
      foreground: "#f7f7fa",
      surface: "#191a20",
    },
  },
];

export function getEventBySlug(slug: string) {
  return demoEvents.find((event) => event.slug === slug);
}

export function getEventById(id: string) {
  return demoEvents.find((event) => event.id === id || event.slug === id);
}
