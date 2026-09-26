import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { EventAdminChrome, eventAdminProfile } from "@/components/event-admin-chrome";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";

export default async function EventManagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, context] = await Promise.all([
    getManagedEvent(eventId),
    requireOrganizerMembership(`/admin/events/${eventId}`),
  ]);

  if (!event) notFound();

  return (
    <EventAdminChrome event={event} profile={eventAdminProfile(context.user)}>
      {children}
    </EventAdminChrome>
  );
}
