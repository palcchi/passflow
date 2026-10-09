import type { PassFlowEvent } from "@/lib/events";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

// One vocabulary for event state everywhere: Draft, Coming soon, Live, Archived.
export function eventStage(event: Pick<PassFlowEvent, "status" | "registrationOpen">): { label: string; tone: Tone } {
  if (event.status === "archived") return { label: "Archived", tone: "neutral" };
  if (event.status !== "published") return { label: "Draft", tone: "neutral" };
  if (event.registrationOpen === false) return { label: "Coming soon", tone: "warning" };
  return { label: "Live", tone: "success" };
}

export const badgeClass = (tone: Tone) => (tone === "neutral" ? "ui-badge" : `ui-badge ui-badge-${tone}`);
